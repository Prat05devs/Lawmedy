import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MatterStatus, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { zipSync } from "fflate";
import { PrismaService } from "../prisma.service";
import { PrivateStorage } from "../evidence/storage.service";
import { PaymentService } from "../payment/payment.service";

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";

@Injectable()
export class AdminService {
  constructor(
    private readonly db: PrismaService,
    private readonly storage: PrivateStorage,
    private readonly payments: PaymentService,
  ) {}

  async dashboard() {
    const [byStatus, pendingPayments, advocates, unassigned] = await Promise.all([
      this.db.matter.groupBy({ by: ["status"], _count: { _all: true } }),
      this.db.payment.count({ where: { status: "SUBMITTED" } }),
      this.db.user.count({ where: { role: "ADVOCATE", active: true } }),
      this.db.matter.count({ where: { status: "DRAFT_GENERATED", assignment: null } }),
    ]);
    return {
      pendingPayments,
      activeAdvocates: advocates,
      awaitingAssignment: unassigned,
      matters: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
      total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    };
  }

  listMatters(filter: { status?: string; q?: string }) {
    const where: Prisma.MatterWhereInput = {};
    if (filter.status && filter.status in MatterStatus) where.status = filter.status as MatterStatus;
    const q = filter.q?.trim();
    if (q)
      where.OR = [
        { referenceNumber: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { fullName: { contains: q, mode: "insensitive" } } },
      ];
    return this.db.matter.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        referenceNumber: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amount: true } },
        assignment: { select: { advocate: { select: { id: true, fullName: true } } } },
        _count: { select: { evidence: true } },
      },
    });
  }

  async getMatter(id: string) {
    const matter = await this.db.matter.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, createdAt: true } },
        statements: { orderBy: { createdAt: "asc" } },
        questions: { orderBy: { createdAt: "asc" }, include: { answer: true, requestedByAdvocate: { select: { fullName: true } } } },
        caseFacts: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        recipient: true,
        rtiDetail: { include: { publicAuthority: true } },
        evidence: { orderBy: { createdAt: "asc" }, include: { extraction: true } },
        payments: { orderBy: { createdAt: "desc" } },
        documents: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } } },
        finalDocument: { select: { filename: true, sizeBytes: true, generatedAt: true, deliveryStatus: true } },
        assignment: { include: { advocate: { select: { id: true, fullName: true, email: true } } } },
      },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    const ids = [matter.id, ...matter.payments.map((p) => p.id), ...(matter.assignment ? [matter.assignment.id] : [])];
    const timeline = await this.db.auditLog.findMany({ where: { entityId: { in: ids } }, orderBy: { createdAt: "asc" }, take: 200 });
    return { ...matter, timeline };
  }

  async evidenceFile(matterId: string, evidenceId: string) {
    const evidence = await this.db.evidence.findFirst({ where: { id: evidenceId, matterId } });
    if (!evidence) throw new NotFoundException("File not found.");
    return { evidence, contents: await this.storage.read(evidence.storageKey) };
  }

  async evidenceZip(matterId: string) {
    const matter = await this.db.matter.findUnique({ where: { id: matterId }, select: { referenceNumber: true, evidence: { orderBy: { createdAt: "asc" } } } });
    if (!matter || !matter.evidence.length) throw new NotFoundException("This matter has no uploaded files.");
    const files: Record<string, Uint8Array> = {};
    let index = 1;
    for (const item of matter.evidence) {
      const contents = await this.storage.read(item.storageKey);
      files[`${String(index++).padStart(2, "0")}-${safeName(item.originalFilename)}`] = new Uint8Array(contents);
    }
    return { name: `${matter.referenceNumber}-files.zip`, contents: Buffer.from(zipSync(files, { level: 0 })) };
  }

  async assign(adminId: string, matterId: string, advocateId: string) {
    return this.db.$transaction(async (tx) => {
      const advocate = await tx.user.findFirst({ where: { id: advocateId, role: "ADVOCATE", active: true } });
      if (!advocate) throw new ConflictException("Choose an active advocate.");
      const matter = await tx.matter.findUnique({ where: { id: matterId } });
      if (!matter) throw new NotFoundException("Matter not found.");
      if (!["DRAFT_GENERATED", "UNDER_ADVOCATE_REVIEW", "USER_RESPONSE_REQUIRED"].includes(matter.status))
        throw new ConflictException("A matter can be assigned once its draft is ready.");
      const assignment = await tx.matterAssignment.upsert({
        where: { matterId },
        create: { matterId, advocateId },
        update: { advocateId, status: "PENDING", newInformation: false },
      });
      if (matter.status === "DRAFT_GENERATED")
        await tx.matter.update({ where: { id: matterId }, data: { status: "UNDER_ADVOCATE_REVIEW" } });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: adminId, action: "MATTER_ASSIGNED_BY_ADMIN", entityType: "MatterAssignment", entityId: assignment.id } });
      return { advocateId };
    });
  }

  pendingPayments() {
    return this.payments.listSubmitted();
  }
  verifyPayment(adminId: string, paymentId: string) {
    return this.payments.verifyManual(adminId, paymentId);
  }
  rejectPayment(adminId: string, paymentId: string, note: string) {
    return this.payments.rejectManual(adminId, paymentId, note);
  }

  async advocates() {
    const rows = await this.db.user.findMany({
      where: { role: "ADVOCATE" },
      orderBy: [{ active: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        active: true,
        createdAt: true,
        advocateAssignments: { select: { status: true } },
      },
    });
    return rows.map(({ advocateAssignments, ...row }) => ({
      ...row,
      open: advocateAssignments.filter((a) => a.status !== "COMPLETED").length,
      completed: advocateAssignments.filter((a) => a.status === "COMPLETED").length,
    }));
  }

  async createAdvocate(adminId: string, input: { fullName: string; email: string; password: string }) {
    if (Buffer.byteLength(input.password, "utf8") > 72) throw new ConflictException("Use a password of at most 72 bytes.");
    const existing = await this.db.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException("An account with this email already exists.");
    const user = await this.db.user.create({
      data: { fullName: input.fullName, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role: "ADVOCATE" },
      select: { id: true, fullName: true, email: true },
    });
    await this.db.auditLog.create({ data: { actorType: "ADMIN", actorId: adminId, action: "ADVOCATE_CREATED", entityType: "User", entityId: user.id } });
    return user;
  }

  async setActive(adminId: string, advocateId: string, active: boolean) {
    const result = await this.db.user.updateMany({ where: { id: advocateId, role: "ADVOCATE" }, data: { active } });
    if (!result.count) throw new NotFoundException("Advocate not found.");
    await this.db.auditLog.create({ data: { actorType: "ADMIN", actorId: adminId, action: active ? "ADVOCATE_ACTIVATED" : "ADVOCATE_DEACTIVATED", entityType: "User", entityId: advocateId } });
    return { active };
  }

  async resetPassword(adminId: string, advocateId: string, password: string) {
    if (Buffer.byteLength(password, "utf8") > 72) throw new ConflictException("Use a password of at most 72 bytes.");
    const result = await this.db.user.updateMany({ where: { id: advocateId, role: "ADVOCATE" }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    if (!result.count) throw new NotFoundException("Advocate not found.");
    await this.db.auditLog.create({ data: { actorType: "ADMIN", actorId: adminId, action: "ADVOCATE_PASSWORD_RESET", entityType: "User", entityId: advocateId } });
    return { ok: true };
  }
}
