import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { PrismaService } from "./prisma.service";
import { PrivateStorage } from "./evidence/storage.service";

// Self-service account deletion (required by the App Store and Google Play).
// Personal content is erased: statements, answers, facts, uploads, drafts, final PDFs and the
// AI records that quote them. What the law makes us keep (payment and audit records) stays,
// detached from the person: the account is anonymised and can no longer sign in.
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(private readonly db: PrismaService, private readonly storage: PrivateStorage) {}

  async deleteAccount(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, active: true } });
    if (!user || !user.active) throw new NotFoundException("Account not found.");
    if (user.role !== "USER") throw new ConflictException("Staff accounts are removed by an administrator.");

    const matters = await this.db.matter.findMany({ where: { userId }, select: { id: true } });
    const mid = matters.map((m) => m.id);
    const files = await this.db.evidence.findMany({ where: { matterId: { in: mid } }, select: { id: true, storageKey: true } });
    const finals = await this.db.finalDocument.findMany({ where: { matterId: { in: mid } }, select: { storageKey: true } });
    const docs = await this.db.legalDocument.findMany({ where: { matterId: { in: mid } }, select: { id: true } });
    const questions = await this.db.matterQuestion.findMany({ where: { matterId: { in: mid } }, select: { id: true } });

    await this.db.$transaction(async (tx) => {
      await tx.finalDocument.deleteMany({ where: { matterId: { in: mid } } });
      await tx.documentVersion.deleteMany({ where: { documentId: { in: docs.map((d) => d.id) } } });
      await tx.legalDocument.deleteMany({ where: { matterId: { in: mid } } });
      await tx.evidenceExtraction.deleteMany({ where: { evidenceId: { in: files.map((f) => f.id) } } });
      await tx.evidence.deleteMany({ where: { matterId: { in: mid } } });
      await tx.matterAnswer.deleteMany({ where: { questionId: { in: questions.map((q) => q.id) } } });
      await tx.matterQuestion.deleteMany({ where: { matterId: { in: mid } } });
      await tx.matterAiAnalysis.deleteMany({ where: { matterId: { in: mid } } });
      await tx.caseFact.deleteMany({ where: { matterId: { in: mid } } });
      await tx.matterRecipient.deleteMany({ where: { matterId: { in: mid } } });
      await tx.rtiDetail.deleteMany({ where: { matterId: { in: mid } } });
      await tx.matterAssignment.deleteMany({ where: { matterId: { in: mid } } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.aiRun.deleteMany({ where: { matterId: { in: mid } } });
      await tx.matter.updateMany({ where: { id: { in: mid } }, data: { currentStatementId: null, applicantAddress: null, applicantPhone: null } });
      await tx.matterStatement.deleteMany({ where: { matterId: { in: mid } } });
      await tx.user.update({
        where: { id: userId },
        data: {
          active: false,
          fullName: "Deleted user",
          email: `deleted-${userId}@deleted.lawmedy.invalid`,
          passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
        },
      });
      await tx.auditLog.create({ data: { actorId: userId, action: "ACCOUNT_DELETED", entityType: "User", entityId: userId } });
    }, { timeout: 60000, maxWait: 20000 });

    // Stored files go after the database commit; a failure here only leaves an orphaned object.
    for (const { storageKey } of [...files, ...finals]) {
      await this.storage.remove(storageKey).catch((error: unknown) => this.logger.warn(`Could not remove stored file: ${error instanceof Error ? error.message : String(error)}`));
    }
    return { deleted: true };
  }
}
