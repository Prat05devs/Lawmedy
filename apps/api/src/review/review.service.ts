import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CaseFactSource, Prisma } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma.service";
import { canonicalFactType, normalizeFactValue } from "./reconciliation";

type Candidate = {
  type: string;
  text: string;
  source: CaseFactSource;
  sourceId: string;
  sourceLabel: string;
};

@Injectable()
export class ReviewService {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async matter(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    return matter;
  }

  private readFacts(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const key =
        "key" in item ? item.key : "field" in item ? item.field : null;
      const factValue = "value" in item ? item.value : null;
      if (typeof key !== "string" || typeof factValue !== "string") return [];
      return [{ key, value: factValue }];
    });
  }

  async prepare(userId: string, matterId: string) {
    const matter = await this.matter(userId, matterId);
    if (matter.status !== "INTAKE_IN_PROGRESS")
      throw new ConflictException(
        "Facts can only be prepared while intake is in progress.",
      );
    const candidates: Candidate[] = [];
    if (matter.currentStatementId) {
      const analysis = await this.db.matterAiAnalysis.findUnique({
        where: { statementId: matter.currentStatementId },
        include: {
          questions: {
            include: { answer: true },
            orderBy: { position: "asc" },
          },
        },
      });
      if (analysis) {
        this.readFacts(analysis.facts).forEach((fact, index) =>
          candidates.push({
            type: canonicalFactType(fact.key),
            text: fact.value,
            source: "STATEMENT",
            sourceId: `${analysis.id}:${index}`,
            sourceLabel: "Statement",
          }),
        );
        analysis.questions.forEach((question) => {
          if (!question.answer) return;
          candidates.push({
            type: canonicalFactType(question.questionType),
            text: question.answer.answer,
            source: "ANSWER",
            sourceId: question.answer.id,
            sourceLabel: "Follow-up answer",
          });
        });
      }
    }
    const evidence = await this.db.evidence.findMany({
      where: { matterId, status: "PROCESSED" },
      include: { extraction: true },
    });
    evidence.forEach((item) => {
      if (!item.extraction || item.extraction.status !== "SUCCEEDED") return;
      const extraction = item.extraction.extraction;
      if (
        !extraction ||
        typeof extraction !== "object" ||
        Array.isArray(extraction)
      )
        return;
      const facts = "facts" in extraction ? extraction.facts : null;
      this.readFacts(Array.isArray(facts) ? facts : []).forEach((fact, index) =>
        candidates.push({
          type: canonicalFactType(fact.key),
          text: fact.value,
          source: "EVIDENCE",
          sourceId: `${item.id}:${index}`,
          sourceLabel: item.originalFilename,
        }),
      );
    });

    const distinctByType = new Map<string, Set<string>>();
    candidates.forEach((candidate) => {
      const values = distinctByType.get(candidate.type) ?? new Set<string>();
      values.add(normalizeFactValue(candidate.type, candidate.text));
      distinctByType.set(candidate.type, values);
    });
    await this.db.$transaction(async (tx) => {
      await tx.caseFact.deleteMany({ where: { matterId } });
      if (candidates.length)
        await tx.caseFact.createMany({
          data: candidates.map((candidate) => ({
            matterId,
            type: candidate.type,
            value: {
              text: candidate.text,
              sourceLabel: candidate.sourceLabel,
              normalized: normalizeFactValue(candidate.type, candidate.text),
            },
            source: candidate.source,
            sourceId: candidate.sourceId,
            confirmedByUser: distinctByType.get(candidate.type)?.size === 1,
          })),
        });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "CASE_FACTS_PREPARED",
          entityType: "Matter",
          entityId: matterId,
        },
      });
    });
    return this.get(userId, matterId);
  }

  async get(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      include: {
        caseFacts: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        recipient: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    const [preparedLog, statement, answer, extraction] = await Promise.all([
      this.db.auditLog.findFirst({
        where: {
          entityType: "Matter",
          entityId: matterId,
          action: "CASE_FACTS_PREPARED",
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      matter.currentStatementId
        ? this.db.matterStatement.findUnique({
            where: { id: matter.currentStatementId },
            select: { createdAt: true },
          })
        : null,
      this.db.matterAnswer.findFirst({
        where: {
          question: {
            matterId,
            ...(matter.currentStatementId
              ? { analysis: { statementId: matter.currentStatementId } }
              : {}),
          },
        },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      this.db.evidenceExtraction.findFirst({
        where: { evidence: { matterId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
    const latestSourceAt = Math.max(
      statement?.createdAt.getTime() ?? 0,
      answer?.updatedAt.getTime() ?? 0,
      extraction?.createdAt.getTime() ?? 0,
    );
    const prepared =
      !!preparedLog && preparedLog.createdAt.getTime() >= latestSourceAt;
    const groups = new Map<string, typeof matter.caseFacts>();
    matter.caseFacts.forEach((fact) => {
      const list = groups.get(fact.type) ?? [];
      list.push(fact);
      groups.set(fact.type, list);
    });
    const factGroups = Array.from(groups.entries()).map(([type, facts]) => {
      const distinct = new Set(
        facts.map((fact) => this.factValue(fact.value).normalized),
      );
      return {
        type,
        conflict: distinct.size > 1,
        selectedId: facts.find((fact) => fact.confirmedByUser)?.id ?? null,
        values: facts.map((fact) => ({
          id: fact.id,
          value: this.factValue(fact.value).text,
          source: fact.source,
          sourceLabel: this.factValue(fact.value).sourceLabel,
          confirmed: fact.confirmedByUser,
        })),
      };
    });
    const amount = this.price(matter.type);
    const keyId = this.config.get<string>("RAZORPAY_KEY_ID", "").trim();
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET", "").trim();
    const webhookSecret = this.config
      .get<string>("RAZORPAY_WEBHOOK_SECRET", "")
      .trim();
    return {
      status: matter.status,
      matterType: matter.type,
      prepared,
      factGroups,
      recipient: matter.recipient,
      applicant: { address: matter.applicantAddress, phone: matter.applicantPhone },
      payment: matter.payments[0] ?? null,
      pricing: { amount, currency: "INR" },
      paymentMode: this.config.get<string>("PAYMENT_MODE", "manual") === "razorpay" ? "razorpay" : "manual",
      paymentLink: this.config.get<string>("PAYMENT_LINK_URL", "https://razorpay.me/@aawasyojana").trim(),
      paymentConfigured:
        this.config.get<string>("PAYMENT_MODE", "manual") !== "razorpay" ||
        (!!keyId &&
        !!keySecret &&
        !!webhookSecret &&
        !keyId.startsWith("replace-") &&
        !keySecret.startsWith("replace-") &&
        !webhookSecret.startsWith("replace-")),
    };
  }

  private factValue(value: Prisma.JsonValue) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return { text: "", sourceLabel: "Unknown", normalized: "" };
    return {
      text: typeof value.text === "string" ? value.text : "",
      sourceLabel:
        typeof value.sourceLabel === "string" ? value.sourceLabel : "Unknown",
      normalized: typeof value.normalized === "string" ? value.normalized : "",
    };
  }

  private price(matterType: "LEGAL_NOTICE" | "RTI") {
    const key = matterType === "RTI" ? "RTI_PRICE_PAISE" : "LEGAL_NOTICE_PRICE_PAISE";
    const value = Number(this.config.get(key, 29900));
    if (!Number.isSafeInteger(value) || value < 100)
      throw new Error(`${key} must be an integer in paise.`);
    return value;
  }

  async confirm(
    userId: string,
    matterId: string,
    input: {
      applicant: { address: string; phone?: string };
      selections: { type: string; caseFactId: string }[];
      recipient?: {
        name: string;
        address: string;
        phone?: string;
        email?: string;
      };
      confirmed: boolean;
    },
  ) {
    if (!input.confirmed)
      throw new BadRequestException(
        "Confirm that the information is accurate.",
      );
    await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; status: string }[]
      >`SELECT id, status::text FROM "Matter" WHERE id = ${matterId} AND "userId" = ${userId} FOR UPDATE`;
      if (!rows.length) throw new NotFoundException("Matter not found.");
      if (rows[0].status !== "INTAKE_IN_PROGRESS")
        throw new ConflictException("This matter can no longer be edited.");
      const matter = await tx.matter.findUniqueOrThrow({
        where: { id: matterId },
        include: { rtiDetail: true },
      });
      if (matter.type === "LEGAL_NOTICE" && !input.recipient)
        throw new BadRequestException("Enter the recipient details.");
      if (matter.type === "RTI" && !matter.rtiDetail)
        throw new BadRequestException("Select the public authority and save the RTI details first.");
      const facts = await tx.caseFact.findMany({ where: { matterId } });
      if (facts.length === 0)
        throw new ConflictException(
          "We could not find any facts from your statement yet. Check that it was analysed, then gather your facts again.",
        );
      const grouped = new Map<string, typeof facts>();
      facts.forEach((fact) => {
        const list = grouped.get(fact.type) ?? [];
        list.push(fact);
        grouped.set(fact.type, list);
      });
      const selections = new Map(
        input.selections.map((item) => [item.type, item.caseFactId]),
      );
      for (const [type, values] of grouped) {
        const distinct = new Set(
          values.map((fact) => this.factValue(fact.value).normalized),
        );
        if (distinct.size <= 1) continue;
        const selectedId = selections.get(type);
        if (!selectedId || !values.some((fact) => fact.id === selectedId))
          throw new BadRequestException(
            `Choose the correct ${type.replaceAll("_", " ")}.`,
          );
        await tx.caseFact.updateMany({
          where: { matterId, type },
          data: { confirmedByUser: false },
        });
        await tx.caseFact.update({
          where: { id: selectedId },
          data: { confirmedByUser: true },
        });
      }
      if (matter.type === "LEGAL_NOTICE" && input.recipient)
        await tx.matterRecipient.upsert({
        where: { matterId },
        create: {
          matterId,
          ...input.recipient,
          phone: input.recipient.phone || null,
          email: input.recipient.email || null,
          confirmedAt: new Date(),
        },
        update: {
          ...input.recipient,
          phone: input.recipient.phone || null,
          email: input.recipient.email || null,
          confirmedAt: new Date(),
        },
        });
      await tx.matter.update({
        where: { id: matterId },
        data: {
          status: "READY_FOR_PAYMENT",
          applicantAddress: input.applicant.address,
          applicantPhone: input.applicant.phone || null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "FACTS_AND_RECIPIENT_CONFIRMED",
          entityType: "Matter",
          entityId: matterId,
        },
      });
    });
    return this.get(userId, matterId);
  }
}
