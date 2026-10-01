import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { GeminiService } from "./gemini.service";
import { parseAnalysis, PROMPT_VERSION } from "./analysis";

const questionsInclude = {
  questions: {
    orderBy: { position: "asc" as const },
    include: { answer: true },
  },
};
@Injectable()
export class IntakeService {
  constructor(
    private readonly db: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  // All mutating intake operations serialize on the matter row, across API instances.
  private async lock(
    tx: Prisma.TransactionClient,
    userId: string,
    matterId: string,
  ) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Matter" WHERE id = ${matterId} AND "userId" = ${userId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException("Matter not found.");
    return tx.matter.findUniqueOrThrow({ where: { id: matterId } });
  }

  async get(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (!matter.currentStatementId)
      return { status: "NOT_STARTED", analysis: null };
    const analysis = await this.db.matterAiAnalysis.findUnique({
      where: { statementId: matter.currentStatementId },
      include: questionsInclude,
    });
    if (analysis)
      return {
        status: "SUCCEEDED",
        analysis,
        allAnswered: analysis.questions.every((q) => !!q.answer),
      };
    const run = await this.db.aiRun.findFirst({
      where: {
        matterId,
        inputReference: matter.currentStatementId,
        taskType: "CASE_CLASSIFICATION",
      },
      orderBy: { createdAt: "desc" },
    });
    if (!run) return { status: "NOT_STARTED", analysis: null };
    const running = run.status === "RUNNING" && run.expiresAt > new Date();
    // Never send raw provider output, prompts, or provider error details to the client.
    return {
      status: running ? "RUNNING" : "FAILED",
      analysis: null,
      message: running
        ? "Understanding your statement…"
        : "Your statement is saved, but we could not analyse it. Please try again.",
    };
  }

  async analyze(
    userId: string,
    matterId: string,
    expectedStatementId?: string,
  ) {
    const settings = this.gemini.settings();
    const claimed = await this.db.$transaction(async (tx) => {
      const matter = await this.lock(tx, userId, matterId);
      if (matter.status !== "DRAFT" && matter.status !== "INTAKE_IN_PROGRESS")
        throw new ConflictException("This matter can no longer be edited.");
      if (!matter.currentStatementId)
        throw new BadRequestException("Save your statement first.");
      if (
        expectedStatementId &&
        expectedStatementId !== matter.currentStatementId
      )
        return null;
      if (
        await tx.matterAiAnalysis.findUnique({
          where: { statementId: matter.currentStatementId },
        })
      )
        return null;
      const now = new Date();
      await tx.aiRun.updateMany({
        where: { matterId, status: "RUNNING", expiresAt: { lte: now } },
        data: {
          status: "FAILED",
          error: "INTERRUPTED_OR_TIMED_OUT",
          finishedAt: now,
        },
      });
      if (
        await tx.aiRun.findFirst({
          where: {
            matterId,
            inputReference: matter.currentStatementId,
            status: "RUNNING",
          },
        })
      )
        return null;
      const statement = await tx.matterStatement.findUniqueOrThrow({
        where: { id: matter.currentStatementId },
      });
      const run = await tx.aiRun.create({
        data: {
          matterId,
          inputReference: statement.id,
          taskType: "CASE_CLASSIFICATION",
          provider: settings.provider,
          modelName: settings.modelName || "NOT_CONFIGURED",
          promptVersion: PROMPT_VERSION,
          expiresAt: new Date(now.getTime() + 90000),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "INTAKE_REQUESTED",
          entityType: "AiRun",
          entityId: run.id,
        },
      });
      return { run, statement, matterType: matter.type };
    });
    if (!claimed) return this.get(userId, matterId);
    const { run, statement, matterType } = claimed;
    const started = Date.now();
    let output: Prisma.InputJsonValue | undefined;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    try {
      const response = await this.gemini.classify(
        statement.statement,
        settings.modelName,
        matterType,
      );
      output = {
        text: response.text,
        response: response.raw,
      } as Prisma.InputJsonValue;
      inputTokens = response.inputTokens;
      outputTokens = response.outputTokens;
      const parsed = parseAnalysis(response.text, statement.statement);
      await this.db.$transaction(async (tx) => {
        await this.lock(tx, userId, matterId);
        const updated = await tx.aiRun.updateMany({
          where: {
            id: run.id,
            status: "RUNNING",
            expiresAt: { gt: new Date() },
          },
          data: {
            status: "SUCCEEDED",
            output,
            inputTokens,
            outputTokens,
            latencyMs: Date.now() - started,
            finishedAt: new Date(),
          },
        });
        if (!updated.count) return; // A reclaimed attempt must never replace a newer result.
        await tx.matterAiAnalysis.create({
          data: {
            matterId,
            statementId: statement.id,
            aiRunId: run.id,
            category: parsed.category,
            summary: parsed.summary,
            facts: parsed.facts,
            missingInformation: parsed.missingInformation,
            questions: {
              create: parsed.missingInformation.map((q, position) => ({
                matterId,
                question: q.question,
                questionType: q.field,
                position,
              })),
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            actorId: "gemini",
            action: "INTAKE_SUCCEEDED",
            entityType: "AiRun",
            entityId: run.id,
          },
        });
      });
    } catch (error) {
      const code =
        error instanceof Error && error.message === "AI_NOT_CONFIGURED"
          ? "AI_NOT_CONFIGURED"
          : output
            ? "INVALID_AI_RESPONSE"
            : "AI_PROVIDER_FAILED";
      // Keep raw responses for diagnosis; do not persist errors that might contain credentials.
      await this.db.$transaction(async (tx) => {
        await tx.aiRun.updateMany({
          where: { id: run.id, status: "RUNNING" },
          data: {
            status: "FAILED",
            output,
            inputTokens,
            outputTokens,
            error: code,
            latencyMs: Date.now() - started,
            finishedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            actorId: "gemini",
            action: "INTAKE_FAILED",
            entityType: "AiRun",
            entityId: run.id,
          },
        });
      });
    }
    return this.get(userId, matterId);
  }

  async answer(
    userId: string,
    matterId: string,
    analysisId: string,
    answers: { questionId: string; answer: string }[],
  ) {
    await this.db.$transaction(async (tx) => {
      const matter = await this.lock(tx, userId, matterId);
      if (matter.status !== "INTAKE_IN_PROGRESS")
        throw new ConflictException("This matter can no longer be edited.");
      const analysis = await tx.matterAiAnalysis.findFirst({
        where: {
          id: analysisId,
          matterId,
          statementId: matter.currentStatementId ?? "",
        },
        include: questionsInclude,
      });
      if (!analysis)
        throw new ConflictException(
          "Your statement changed. Refresh to answer its current questions.",
        );
      const ids = answers.map((a) => a.questionId);
      if (
        new Set(ids).size !== ids.length ||
        ids.some((id) => !analysis.questions.some((q) => q.id === id))
      )
        throw new BadRequestException(
          "Answers must match the current questions without duplicates.",
        );
      for (const item of answers)
        await tx.matterAnswer.upsert({
          where: { questionId: item.questionId },
          create: item,
          update: { answer: item.answer },
        });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "INTAKE_ANSWERS_SAVED",
          entityType: "MatterAiAnalysis",
          entityId: analysis.id,
        },
      });
    });
    return this.get(userId, matterId);
  }
}
