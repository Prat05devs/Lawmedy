import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { GovernmentLevel } from "@prisma/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class RtiService {
  constructor(private readonly db: PrismaService) {}

  authorities() {
    return this.db.publicAuthority.findMany({ orderBy: [{ governmentLevel: "asc" }, { name: "asc" }] });
  }

  async get(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      include: { rtiDetail: { include: { publicAuthority: true } } },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.type !== "RTI") throw new ConflictException("RTI details are only available for RTI matters.");
    return matter.rtiDetail;
  }

  async save(userId: string, matterId: string, input: {
    governmentLevel: GovernmentLevel; state?: string; department: string;
    publicAuthorityId: string; subject: string; periodFrom?: string; periodTo?: string;
  }) {
    const matter = await this.db.matter.findFirst({ where: { id: matterId, userId } });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.type !== "RTI") throw new ConflictException("RTI details are only available for RTI matters.");
    if (matter.status !== "DRAFT" && matter.status !== "INTAKE_IN_PROGRESS")
      throw new ConflictException("This RTI can no longer be edited.");
    const authority = await this.db.publicAuthority.findUnique({ where: { id: input.publicAuthorityId } });
    if (!authority) throw new NotFoundException("Public authority not found.");
    if (authority.governmentLevel !== input.governmentLevel || (authority.state ?? null) !== (input.state || null))
      throw new ConflictException("The selected authority does not match the government level and state.");
    const from = input.periodFrom ? new Date(`${input.periodFrom}T00:00:00.000Z`) : null;
    const to = input.periodTo ? new Date(`${input.periodTo}T00:00:00.000Z`) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to))
      throw new ConflictException("Enter a valid information period.");
    await this.db.$transaction(async (tx) => {
      await tx.rtiDetail.upsert({
        where: { matterId },
        create: { matterId, ...input, state: input.state || null, periodFrom: from, periodTo: to },
        update: { ...input, state: input.state || null, periodFrom: from, periodTo: to },
      });
      await tx.auditLog.create({ data: { actorId: userId, action: "RTI_DETAILS_SAVED", entityType: "Matter", entityId: matterId } });
    });
    return this.get(userId, matterId);
  }
}
