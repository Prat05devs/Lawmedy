import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MatterType } from "@prisma/client";
import { PrismaService } from "./prisma.service";

@Injectable()
export class MattersService {
  constructor(private readonly db: PrismaService) {}
  create(userId: string, type: MatterType) {
    return this.db.$transaction(async (tx) => {
      const matter = await tx.matter.create({ data: { userId, type } });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "MATTER_CREATED",
          entityType: "Matter",
          entityId: matter.id,
        },
      });
      return matter;
    });
  }
  list(userId: string) {
    return this.db.matter.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { statements: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }
  async get(userId: string, id: string) {
    const matter = await this.db.matter.findFirst({
      where: { id, userId },
      include: { statements: { orderBy: { createdAt: "desc" } } },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    return matter;
  }
  saveStatement(userId: string, id: string, statement: string) {
    return this.db.$transaction(async (tx) => {
      const matter = await tx.matter.findFirst({ where: { id, userId } });
      if (!matter) throw new NotFoundException("Matter not found.");
      if (matter.status === "COMPLETED")
        throw new ConflictException("Completed matters cannot be edited.");
      // Conditional update also protects against a concurrent completion.
      const updated = await tx.matter.updateMany({
        where: { id, userId, status: { in: ["DRAFT", "INTAKE_IN_PROGRESS"] } },
        data: { status: "INTAKE_IN_PROGRESS" },
      });
      if (updated.count !== 1)
        throw new ConflictException("Matter is no longer editable.");
      const saved = await tx.matterStatement.create({
        data: { matterId: id, statement },
      });
      await tx.matter.update({
        where: { id },
        data: { currentStatementId: saved.id },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "STATEMENT_SAVED",
          entityType: "Matter",
          entityId: id,
        },
      });
      return saved;
    });
  }
}
