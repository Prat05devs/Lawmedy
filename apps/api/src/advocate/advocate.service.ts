import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { PrivateStorage } from "../evidence/storage.service";
import type {
  AdvocateDraftDto,
  AdvocateRequestDto,
  AdvocateResponseDto,
  AdvocateRtiDraftDto,
} from "../dto";
import { FinalDocumentService } from "../final-document/final-document.service";

@Injectable()
export class AdvocateService {
  private readonly logger = new Logger(AdvocateService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly storage: PrivateStorage,
    private readonly finalDocuments: FinalDocumentService,
  ) {}

  async assign(matterId: string) {
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ status: string }[]>`
        SELECT status::text FROM "Matter" WHERE id = ${matterId} FOR UPDATE
      `;
      if (!rows.length || rows[0].status !== "DRAFT_GENERATED") return false;
      const candidates = await tx.user.findMany({
        where: { role: "ADVOCATE", active: true },
        select: { id: true, advocateAssignments: { where: { status: { not: "COMPLETED" } }, select: { id: true } } },
        orderBy: { createdAt: "asc" },
      });
      // Least-loaded active advocate first; an admin can reassign from the dashboard.
      const advocate = [...candidates].sort((a, b) => a.advocateAssignments.length - b.advocateAssignments.length)[0];
      if (!advocate) {
        // Keep the matter visible to operations instead of failing silently.
        await tx.auditLog.create({ data: { actorType: "SYSTEM", actorId: "lawmedy", action: "NO_ADVOCATE_AVAILABLE", entityType: "Matter", entityId: matterId } });
        this.logger.warn(`No advocate account exists to review matter ${matterId}`);
        return false;
      }
      const assignment = await tx.matterAssignment.upsert({
        where: { matterId },
        create: { matterId, advocateId: advocate.id },
        update: {
          advocateId: advocate.id,
          status: "PENDING",
          newInformation: false,
        },
      });
      await tx.matter.update({
        where: { id: matterId },
        data: { status: "UNDER_ADVOCATE_REVIEW" },
      });
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          actorId: "lawmedy",
          action: "MATTER_ASSIGNED_TO_ADVOCATE",
          entityType: "MatterAssignment",
          entityId: assignment.id,
        },
      });
      return true;
    });
  }

  list(advocateId: string) {
    return this.db.matterAssignment.findMany({
      where: { advocateId },
      orderBy: { assignedAt: "asc" },
      include: {
        matter: {
          include: {
            user: { select: { fullName: true, email: true } },
            statements: { orderBy: { createdAt: "desc" }, take: 1 },
            documents: { select: { currentVersion: true }, take: 1 },
          },
        },
      },
    });
  }

  async get(advocateId: string, matterId: string) {
    const assignment = await this.db.matterAssignment.findFirst({
      where: { matterId, advocateId },
      include: {
        matter: {
          include: {
            user: { select: { fullName: true, email: true } },
            statements: { orderBy: { createdAt: "asc" } },
            caseFacts: {
              where: { confirmedByUser: true },
              orderBy: [{ type: "asc" }, { createdAt: "asc" }],
            },
            recipient: true,
            evidence: {
              orderBy: { createdAt: "asc" },
              include: { extraction: true },
            },
            rtiDetail: { include: { publicAuthority: true } },
            documents: {
              include: { versions: { orderBy: { versionNumber: "desc" } } },
              take: 1,
            },
            questions: {
              where: { requestedByAdvocateId: { not: null } },
              orderBy: { createdAt: "asc" },
              include: { answer: true, requestedByAdvocate: { select: { fullName: true } } },
            },
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException("Assigned matter not found.");
    await this.db.$transaction([
      this.db.matterAssignment.update({
        where: { id: assignment.id },
        data: { newInformation: false },
      }),
      this.db.auditLog.create({
        data: {
          actorType: "ADVOCATE",
          actorId: advocateId,
          action: "ADVOCATE_MATTER_VIEWED",
          entityType: "Matter",
          entityId: matterId,
        },
      }),
    ]);
    return assignment;
  }

  async editDraft(
    advocateId: string,
    matterId: string,
    input: AdvocateDraftDto,
  ) {
    await this.db.$transaction(async (tx) => {
      await this.lockAssigned(tx, advocateId, matterId, [
        "UNDER_ADVOCATE_REVIEW",
        "USER_RESPONSE_REQUIRED",
      ]);
      const document = await tx.legalDocument.findFirst({
        where: { matterId, documentType: "LEGAL_NOTICE" },
        include: {
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
      });
      if (!document || !document.versions[0])
        throw new ConflictException("No legal notice draft is available to edit.");
      if (document.currentVersion !== input.expectedVersion)
        throw new ConflictException(
          "The draft changed. Refresh before saving your edits.",
        );
      const current = this.documentContent(document.versions[0].content);
      const content: Prisma.InputJsonValue = {
        status: "READY",
        missingInformation: [],
        sender: {
          name: input.senderName,
          address: input.senderAddress || null,
        },
        recipient: {
          name: input.recipientName,
          address: input.recipientAddress || null,
        },
        subject: input.subject,
        paragraphs: input.paragraphs.map((paragraph, index) => ({
          section: current.paragraphs[index]?.section ?? "FACTS",
          text: paragraph.text,
          caseFactIds: current.paragraphs[index]?.caseFactIds ?? [],
        })),
        legalBasisIds: current.legalBasisIds,
        demand: input.demand,
        responseDays: current.responseDays,
        responsePeriod: input.responsePeriod,
      };
      const version = await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: document.currentVersion + 1,
          content,
          createdByType: "ADVOCATE",
          createdById: advocateId,
        },
      });
      await tx.legalDocument.update({
        where: { id: document.id },
        data: {
          currentVersion: version.versionNumber,
          status: "READY",
          reviewedById: null,
          reviewedAt: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "ADVOCATE",
          actorId: advocateId,
          action: "ADVOCATE_DRAFT_EDITED",
          entityType: "DocumentVersion",
          entityId: version.id,
        },
      });
    });
    return this.get(advocateId, matterId);
  }

  async editRtiDraft(advocateId: string, matterId: string, input: AdvocateRtiDraftDto) {
    await this.db.$transaction(async (tx) => {
      await this.lockAssigned(tx, advocateId, matterId, ["UNDER_ADVOCATE_REVIEW", "USER_RESPONSE_REQUIRED"]);
      const document = await tx.legalDocument.findFirst({
        where: { matterId, documentType: "RTI" },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      });
      if (!document || !document.versions[0]) throw new ConflictException("No RTI draft is available to edit.");
      if (document.currentVersion !== input.expectedVersion)
        throw new ConflictException("The draft changed. Refresh before saving your edits.");
      const current = document.versions[0].content;
      if (!current || typeof current !== "object" || Array.isArray(current) || !Array.isArray((current as Record<string, unknown>).informationRequests))
        throw new ConflictException("The current draft is invalid.");
      const base = current as Record<string, unknown> & { informationRequests: { text?: string; caseFactIds?: string[] }[] };
      // Each request keeps the confirmed-fact references it was drafted from. A request the
      // advocate adds borrows the draft's references so the stored application stays valid.
      const fallbackIds = base.informationRequests.find((item) => item.caseFactIds?.length)?.caseFactIds ?? [];
      const content: Prisma.InputJsonValue = {
        ...(base as Prisma.InputJsonObject),
        status: "READY",
        missingInformation: [],
        subject: input.subject,
        informationRequests: input.informationRequests.map((item, index) => ({
          text: item.text,
          caseFactIds: base.informationRequests[index]?.caseFactIds?.length ? base.informationRequests[index].caseFactIds! : fallbackIds,
        })),
      };
      const version = await tx.documentVersion.create({
        data: { documentId: document.id, versionNumber: document.currentVersion + 1, content, createdByType: "ADVOCATE", createdById: advocateId },
      });
      await tx.legalDocument.update({
        where: { id: document.id },
        data: { currentVersion: version.versionNumber, status: "READY", reviewedById: null, reviewedAt: null },
      });
      await tx.auditLog.create({
        data: { actorType: "ADVOCATE", actorId: advocateId, action: "ADVOCATE_DRAFT_EDITED", entityType: "DocumentVersion", entityId: version.id },
      });
    });
    return this.get(advocateId, matterId);
  }

  async requestInformation(
    advocateId: string,
    matterId: string,
    input: AdvocateRequestDto,
  ) {
    await this.db.$transaction(async (tx) => {
      const assignment = await this.lockAssigned(tx, advocateId, matterId, [
        "UNDER_ADVOCATE_REVIEW",
      ]);
      const position = await tx.matterQuestion.count({ where: { matterId } });
      const question = await tx.matterQuestion.create({
        data: {
          matterId,
          analysisId: null,
          requestedByAdvocateId: advocateId,
          question: input.question,
          questionType: "ADVOCATE_REQUEST",
          position,
        },
      });
      await tx.matter.update({
        where: { id: matterId },
        data: { status: "USER_RESPONSE_REQUIRED" },
      });
      await tx.matterAssignment.update({
        where: { id: assignment.assignmentId },
        data: { status: "WAITING_FOR_USER", newInformation: false },
      });
      await tx.notification.create({
        data: {
          userId: assignment.userId,
          matterId,
          title: "Your advocate needs more information",
          message: input.question,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "ADVOCATE",
          actorId: advocateId,
          action: "ADVOCATE_INFORMATION_REQUESTED",
          entityType: "MatterQuestion",
          entityId: question.id,
        },
      });
    });
    return this.get(advocateId, matterId);
  }

  async approve(advocateId: string, matterId: string, confirmed: boolean) {
    if (!confirmed)
      throw new BadRequestException("Confirm the final draft before approval.");
    await this.db.$transaction(async (tx) => {
      const assignment = await this.lockAssigned(tx, advocateId, matterId, [
        "UNDER_ADVOCATE_REVIEW",
      ]);
      const matter = await tx.matter.findUniqueOrThrow({ where: { id: matterId }, select: { type: true } });
      const document = await tx.legalDocument.findFirst({
        where: { matterId, documentType: matter.type === "RTI" ? "RTI" : "LEGAL_NOTICE", status: "READY" },
      });
      if (!document || document.currentVersion < 1)
        throw new ConflictException("No final draft is available to approve.");
      const now = new Date();
      await tx.legalDocument.update({
        where: { id: document.id },
        data: { reviewedById: advocateId, reviewedAt: now },
      });
      await tx.matter.update({
        where: { id: matterId },
        data: { status: "APPROVED" },
      });
      await tx.matterAssignment.update({
        where: { id: assignment.assignmentId },
        data: { status: "COMPLETED", newInformation: false },
      });
      await tx.notification.create({
        data: {
          userId: assignment.userId,
          matterId,
          title: matter.type === "RTI" ? "Your RTI application was approved" : "Your legal notice was approved",
          message: "Your advocate has approved the final draft. We are preparing your PDF.",
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "ADVOCATE",
          actorId: advocateId,
          action: "ADVOCATE_DRAFT_APPROVED",
          entityType: "LegalDocument",
          entityId: document.id,
        },
      });
    });
    try {
      await this.finalDocuments.generateAndDeliver(matterId);
    } catch (error) {
      this.logger.error(
        `Final PDF generation is pending for matter ${matterId}`,
        error,
      );
    }
    return this.get(advocateId, matterId);
  }

  async requestsForUser(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      select: { id: true, status: true },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    const requests = await this.db.matterQuestion.findMany({
      where: { matterId, requestedByAdvocateId: { not: null } },
      orderBy: { createdAt: "asc" },
      include: { answer: true },
    });
    return { status: matter.status, requests };
  }

  async respond(
    userId: string,
    matterId: string,
    input: AdvocateResponseDto,
  ) {
    await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ status: string }[]>`
        SELECT status::text FROM "Matter" WHERE id = ${matterId} AND "userId" = ${userId} FOR UPDATE
      `;
      if (!rows.length) throw new NotFoundException("Matter not found.");
      if (rows[0].status !== "USER_RESPONSE_REQUIRED")
        throw new ConflictException("No advocate response is currently required.");
      const question = await tx.matterQuestion.findFirst({
        where: {
          id: input.questionId,
          matterId,
          requestedByAdvocateId: { not: null },
        },
      });
      if (!question)
        throw new BadRequestException("This information request is not current.");
      await tx.matterAnswer.upsert({
        where: { questionId: question.id },
        create: { questionId: question.id, answer: input.answer },
        update: { answer: input.answer },
      });
      const assignment = await tx.matterAssignment.findUniqueOrThrow({
        where: { matterId },
      });
      await tx.matter.update({
        where: { id: matterId },
        data: { status: "UNDER_ADVOCATE_REVIEW" },
      });
      await tx.matterAssignment.update({
        where: { id: assignment.id },
        data: { status: "PENDING", newInformation: true },
      });
      await tx.notification.create({
        data: {
          userId: assignment.advocateId,
          matterId,
          title: "New information received",
          message: "The user responded to your information request.",
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorId: userId,
          action: "ADVOCATE_INFORMATION_RESPONDED",
          entityType: "MatterQuestion",
          entityId: question.id,
        },
      });
    });
    return this.requestsForUser(userId, matterId);
  }

  markNotificationsRead(userId: string) {
    return this.db.notification
      .updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
      .then((result) => ({ updated: result.count }));
  }

  notifications(userId: string) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        matterId: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  async evidenceFile(
    advocateId: string,
    matterId: string,
    evidenceId: string,
  ) {
    const assignment = await this.db.matterAssignment.findFirst({
      where: { matterId, advocateId },
      select: { id: true },
    });
    if (!assignment) throw new NotFoundException("Assigned matter not found.");
    const evidence = await this.db.evidence.findFirst({
      where: { id: evidenceId, matterId },
    });
    if (!evidence) throw new NotFoundException("Evidence not found.");
    const contents = await this.storage.read(evidence.storageKey);
    await this.db.auditLog.create({
      data: {
        actorType: "ADVOCATE",
        actorId: advocateId,
        action: "ADVOCATE_EVIDENCE_VIEWED",
        entityType: "Evidence",
        entityId: evidence.id,
      },
    });
    return { evidence, contents };
  }

  private async lockAssigned(
    tx: Prisma.TransactionClient,
    advocateId: string,
    matterId: string,
    statuses: string[],
  ) {
    const rows = await tx.$queryRaw<
      { status: string; userId: string; assignmentId: string }[]
    >`
      SELECT m.status::text, m."userId", a.id AS "assignmentId"
      FROM "Matter" m
      JOIN "MatterAssignment" a ON a."matterId" = m.id
      WHERE m.id = ${matterId} AND a."advocateId" = ${advocateId}
      FOR UPDATE OF m, a
    `;
    if (!rows.length) throw new NotFoundException("Assigned matter not found.");
    if (!statuses.includes(rows[0].status))
      throw new ConflictException("This matter is not available for that action.");
    return rows[0];
  }

  private documentContent(value: Prisma.JsonValue) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new ConflictException("The current draft is invalid.");
    const paragraphs = "paragraphs" in value ? value.paragraphs : null;
    if (!Array.isArray(paragraphs))
      throw new ConflictException("The current draft is invalid.");
    const basis = "legalBasisIds" in value && Array.isArray(value.legalBasisIds)
      ? value.legalBasisIds.filter((id): id is string => typeof id === "string")
      : [];
    const days = "responseDays" in value && typeof value.responseDays === "number" ? value.responseDays : null;
    return {
      legalBasisIds: basis,
      responseDays: days,
      paragraphs: paragraphs.map((paragraph) => {
        if (!paragraph || typeof paragraph !== "object" || Array.isArray(paragraph))
          return { caseFactIds: [] as string[], section: "FACTS" };
        const ids = "caseFactIds" in paragraph ? paragraph.caseFactIds : null;
        return {
          section: "section" in paragraph && paragraph.section === "DEFAULT" ? "DEFAULT" : "FACTS",
          caseFactIds: Array.isArray(ids)
            ? ids.filter((id): id is string => typeof id === "string")
            : [],
        };
      }),
    };
  }
}
