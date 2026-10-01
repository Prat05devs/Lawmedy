import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MatterType, Prisma } from "@prisma/client";
import { AdvocateService } from "../advocate/advocate.service";
import { FinalDocumentService } from "../final-document/final-document.service";
import { GeminiService } from "../intake/gemini.service";
import { PrismaService } from "../prisma.service";
import { parseRti, parseRtiQa, RTI_PROMPT_VERSION, RTI_QA_PROMPT_VERSION, type RtiDraft } from "../rti/rti";
import { NOTICE_PROMPT_VERSION, parseNotice, parseNoticeQa, QA_PROMPT_VERSION, type Notice } from "./notice";

type ConfirmedFact = { id: string; type: string; value: string };
type Draft = Notice | RtiDraft;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly db: PrismaService,
    private readonly gemini: GeminiService,
    private readonly advocates: AdvocateService,
    private readonly finalDocuments: FinalDocumentService,
  ) {}

  private documentType(type: MatterType) { return type === "RTI" ? "RTI" : "LEGAL_NOTICE"; }
  private taskTypes(type: MatterType) { return type === "RTI" ? ["RTI_GENERATION", "RTI_QA"] : ["NOTICE_GENERATION", "NOTICE_QA"]; }

  async get(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      include: { documents: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } } } },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    const document = matter.documents.find((item) => item.documentType === this.documentType(matter.type)) ?? null;
    const version = document?.versions[0] ?? null;
    const lastRun = await this.db.aiRun.findFirst({
      where: { matterId, taskType: { in: this.taskTypes(matter.type) } },
      orderBy: { createdAt: "desc" }, select: { status: true, error: true, expiresAt: true },
    });
    const running = lastRun?.status === "RUNNING" && lastRun.expiresAt > new Date();
    const state = version && document?.status === "READY" ? "READY"
      : document?.status === "MISSING_INFORMATION" ? "MISSING_INFORMATION"
      : lastRun?.error === "AI_NOT_CONFIGURED" ? "WAITING_FOR_CONFIGURATION"
      : running || matter.status === "AI_PROCESSING" ? document?.status === "FAILED" ? "FAILED" : "PROCESSING"
      : "NOT_STARTED";
    return {
      matterStatus: matter.status, state, configured: this.gemini.configured(), matterType: matter.type,
      document: version ? { id: document!.id, versionNumber: version.versionNumber, content: version.content, createdAt: version.createdAt, qa: this.qaSummary(version.qa) } : null,
      message: state === "MISSING_INFORMATION" ? "The draft needs more confirmed information before it can be prepared."
        : state === "WAITING_FOR_CONFIGURATION" ? "AI setup is pending. Your payment and confirmed information are safe."
        : state === "FAILED" ? "We could not prepare the draft. Your information is safe; please try again." : null,
    };
  }

  async retry(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({ where: { id: matterId, userId }, select: { status: true } });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.status !== "PAID" && matter.status !== "AI_PROCESSING") throw new ConflictException("This draft cannot be generated right now.");
    await this.generateAfterPayment(matterId);
    return this.get(userId, matterId);
  }

  async generateAfterPayment(matterId: string) {
    const settings = this.gemini.settings();
    const claimed = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string; status: string; type: MatterType }[]>`
        SELECT id, status::text, type::text FROM "Matter" WHERE id = ${matterId} FOR UPDATE
      `;
      if (!rows.length || !["PAID", "AI_PROCESSING"].includes(rows[0].status)) return null;
      const type = rows[0].type;
      const taskTypes = this.taskTypes(type);
      const now = new Date();
      await tx.aiRun.updateMany({ where: { matterId, taskType: { in: taskTypes }, status: "RUNNING", expiresAt: { lte: now } }, data: { status: "FAILED", error: "INTERRUPTED_OR_TIMED_OUT", finishedAt: now } });
      if (await tx.aiRun.findFirst({ where: { matterId, taskType: { in: taskTypes }, status: "RUNNING", expiresAt: { gt: now } } })) return null;
      const matter = await tx.matter.findUniqueOrThrow({
        where: { id: matterId }, include: {
          user: { select: { fullName: true } },
          caseFacts: { where: { confirmedByUser: true }, orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
          recipient: true, analyses: { orderBy: { createdAt: "desc" }, take: 1 },
          rtiDetail: { include: { publicAuthority: true } },
        },
      });
      if (type === "RTI" && !matter.rtiDetail) throw new ConflictException("Save the RTI details first.");
      const documentType = this.documentType(type);
      const document = await tx.legalDocument.upsert({
        where: { matterId_documentType: { matterId, documentType } }, create: { matterId, documentType }, update: { status: "PROCESSING" },
      });
      const category = matter.analyses[0]?.category ?? "*";
      const specific = await tx.matterWorkflowConfiguration.findUnique({ where: { matterType_category: { matterType: type, category } } });
      const fallback = specific ?? await tx.matterWorkflowConfiguration.findUnique({ where: { matterType_category: { matterType: type, category: "*" } } });
      const requiresAdvocateReview = fallback?.requiresAdvocateReview ?? type === "LEGAL_NOTICE";
      const generationTask = taskTypes[0];
      const run = await tx.aiRun.create({ data: {
        matterId, taskType: generationTask, provider: settings.provider, modelName: settings.modelName || "NOT_CONFIGURED",
        promptVersion: type === "RTI" ? RTI_PROMPT_VERSION : NOTICE_PROMPT_VERSION,
        inputReference: `confirmed-facts:${document.currentVersion + 1}`, expiresAt: new Date(now.getTime() + 90000),
      } });
      await tx.matter.update({ where: { id: matterId }, data: { status: "AI_PROCESSING" } });
      await tx.auditLog.create({ data: { actorType: "SYSTEM", actorId: "lawmedy", action: `${generationTask}_REQUESTED`, entityType: "AiRun", entityId: run.id } });
      const confirmedFacts = this.confirmedFacts(matter.caseFacts);
      const input = type === "RTI" ? {
        confirmedFacts, applicant: { name: matter.user.fullName },
        rti: { subject: matter.rtiDetail!.subject, periodFrom: matter.rtiDetail!.periodFrom?.toISOString().slice(0, 10) ?? null, periodTo: matter.rtiDetail!.periodTo?.toISOString().slice(0, 10) ?? null, publicAuthority: matter.rtiDetail!.publicAuthority },
      } : {
        category, confirmedFacts,
        recipient: matter.recipient ? { name: matter.recipient.name, address: matter.recipient.address, phone: matter.recipient.phone, email: matter.recipient.email } : null,
      };
      return { type, run, document, input, confirmedFacts, requiresAdvocateReview };
    });
    if (!claimed) return;
    const allowedFactIds = new Set(claimed.confirmedFacts.map((fact) => fact.id));
    const started = Date.now();
    let rawOutput: Prisma.InputJsonValue | undefined;
    try {
      const response = claimed.type === "RTI" ? await this.gemini.generateRti(claimed.input, settings.modelName) : await this.gemini.generateNotice(claimed.input, settings.modelName);
      rawOutput = { text: response.text, response: response.raw } as Prisma.InputJsonValue;
      const draft = claimed.type === "RTI" ? parseRti(response.text, allowedFactIds) : parseNotice(response.text, allowedFactIds);
      if (draft.status === "MISSING_INFORMATION") {
        await this.finishMissingInformation(claimed.run.id, claimed.document.id, rawOutput, response, started, claimed.type);
        return;
      }
      const prepared = await this.saveVersionAndStartQa(matterId, claimed.run.id, claimed.document.id, claimed.document.currentVersion + 1, draft, rawOutput, response, started, settings, claimed.type);
      await this.runQa(matterId, prepared.versionId, prepared.qaRunId, claimed.confirmedFacts, claimed.input, draft, allowedFactIds, settings.modelName, claimed.type, claimed.requiresAdvocateReview);
    } catch (error) {
      await this.failRun(claimed.run.id, claimed.document.id, rawOutput, started, error, `${claimed.type === "RTI" ? "RTI" : "NOTICE"}_GENERATION_FAILED`);
    }
  }

  private confirmedFacts(facts: Array<{ id: string; type: string; value: Prisma.JsonValue }>): ConfirmedFact[] {
    const seen = new Set<string>();
    return facts.flatMap((fact) => {
      if (!fact.value || typeof fact.value !== "object" || Array.isArray(fact.value)) return [];
      const text = "text" in fact.value ? fact.value.text : null;
      const normalized = "normalized" in fact.value ? fact.value.normalized : text;
      if (typeof text !== "string") return [];
      const key = `${fact.type}:${String(normalized)}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ id: fact.id, type: fact.type, value: text }];
    });
  }

  private async finishMissingInformation(runId: string, documentId: string, output: Prisma.InputJsonValue, usage: { inputTokens: number | null; outputTokens: number | null }, started: number, type: MatterType) {
    await this.db.$transaction(async (tx) => {
      await tx.aiRun.update({ where: { id: runId }, data: { status: "SUCCEEDED", output, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, latencyMs: Date.now() - started, finishedAt: new Date() } });
      await tx.legalDocument.update({ where: { id: documentId }, data: { status: "MISSING_INFORMATION" } });
      await tx.auditLog.create({ data: { actorType: "SYSTEM", actorId: "gemini", action: `${type === "RTI" ? "RTI" : "NOTICE"}_MISSING_INFORMATION`, entityType: "LegalDocument", entityId: documentId } });
    });
  }

  private async saveVersionAndStartQa(matterId: string, runId: string, documentId: string, versionNumber: number, draft: Draft, output: Prisma.InputJsonValue, usage: { inputTokens: number | null; outputTokens: number | null }, started: number, settings: { provider: string; modelName: string }, type: MatterType) {
    return this.db.$transaction(async (tx) => {
      await tx.aiRun.update({ where: { id: runId }, data: { status: "SUCCEEDED", output, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, latencyMs: Date.now() - started, finishedAt: new Date() } });
      const version = await tx.documentVersion.create({ data: { documentId, versionNumber, content: draft, createdByType: "AI", createdById: settings.modelName || "gemini", aiRunId: runId } });
      await tx.legalDocument.update({ where: { id: documentId }, data: { currentVersion: versionNumber, status: "PROCESSING" } });
      const qaRun = await tx.aiRun.create({ data: { matterId, taskType: type === "RTI" ? "RTI_QA" : "NOTICE_QA", provider: settings.provider, modelName: settings.modelName || "NOT_CONFIGURED", promptVersion: type === "RTI" ? RTI_QA_PROMPT_VERSION : QA_PROMPT_VERSION, inputReference: version.id, expiresAt: new Date(Date.now() + 90000) } });
      return { versionId: version.id, qaRunId: qaRun.id };
    });
  }

  private async runQa(matterId: string, versionId: string, qaRunId: string, confirmedFacts: ConfirmedFact[], input: unknown, draft: Draft, allowedFactIds: Set<string>, modelName: string, type: MatterType, requiresAdvocateReview: boolean) {
    const started = Date.now();
    let rawOutput: Prisma.InputJsonValue | undefined;
    try {
      const response = type === "RTI" ? await this.gemini.qaRti({ confirmedFacts, matter: input, draft }, modelName) : await this.gemini.qaNotice({ confirmedFacts, matter: input, draft }, modelName);
      rawOutput = { text: response.text, response: response.raw } as Prisma.InputJsonValue;
      const qa = type === "RTI" ? parseRtiQa(response.text, allowedFactIds) : parseNoticeQa(response.text, allowedFactIds);
      await this.db.$transaction(async (tx) => {
        await tx.aiRun.update({ where: { id: qaRunId }, data: { status: "SUCCEEDED", output: rawOutput, inputTokens: response.inputTokens, outputTokens: response.outputTokens, latencyMs: Date.now() - started, finishedAt: new Date() } });
        const version = await tx.documentVersion.update({ where: { id: versionId }, data: { qa, qaAiRunId: qaRunId } });
        await tx.legalDocument.update({ where: { id: version.documentId }, data: { status: "READY" } });
        await tx.matter.update({ where: { id: matterId }, data: { status: requiresAdvocateReview ? "DRAFT_GENERATED" : "APPROVED" } });
        await tx.auditLog.create({ data: { actorType: "SYSTEM", actorId: "gemini", action: `${type === "RTI" ? "RTI" : "NOTICE"}_GENERATION_AND_QA_COMPLETED`, entityType: "DocumentVersion", entityId: versionId } });
      });
      if (requiresAdvocateReview) await this.advocates.assign(matterId);
      else await this.finalDocuments.generateAndDeliver(matterId);
    } catch (error) {
      const version = await this.db.documentVersion.findUniqueOrThrow({ where: { id: versionId }, select: { documentId: true } });
      await this.failRun(qaRunId, version.documentId, rawOutput, started, error, `${type === "RTI" ? "RTI" : "NOTICE"}_QA_FAILED`);
    }
  }

  private async failRun(runId: string, documentId: string, output: Prisma.InputJsonValue | undefined, started: number, error: unknown, action: string) {
    const code = error instanceof Error && error.message === "AI_NOT_CONFIGURED" ? "AI_NOT_CONFIGURED" : output ? "INVALID_AI_RESPONSE" : "AI_PROVIDER_FAILED";
    await this.db.$transaction(async (tx) => {
      await tx.aiRun.updateMany({ where: { id: runId, status: "RUNNING" }, data: { status: "FAILED", output, error: code, latencyMs: Date.now() - started, finishedAt: new Date() } });
      await tx.legalDocument.update({ where: { id: documentId }, data: { status: "FAILED" } });
      await tx.auditLog.create({ data: { actorType: "SYSTEM", actorId: "gemini", action, entityType: "AiRun", entityId: runId } });
    });
  }

  private qaSummary(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return { passed: value.passed === true, issueCount: Array.isArray(value.issues) ? value.issues.length : 0, warningCount: Array.isArray(value.warnings) ? value.warnings.length : 0 };
  }
}
