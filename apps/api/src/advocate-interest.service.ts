import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AdvocateInterestStatus } from "@prisma/client";
import { PrismaService } from "./prisma.service";

// Indian mobile numbers, written any common way (+91, 91, 0 or nothing in front; spaces or
// dashes). Stored as +91XXXXXXXXXX so the team can call or WhatsApp straight from the list.
export function normalizeIndianMobile(input: string) {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

@Injectable()
export class AdvocateInterestService {
  constructor(private readonly db: PrismaService) {}

  // Registering twice with the same email updates the earlier entry instead of adding a duplicate.
  // The reply is the same either way, so the form cannot be used to check who has registered.
  async register(input: { fullName: string; email: string; phone?: string; practicePlace: string; source?: string }) {
    const phone = input.phone?.trim() ? normalizeIndianMobile(input.phone) : null;
    if (input.phone?.trim() && !phone) throw new BadRequestException("Enter a 10-digit Indian mobile number, or leave it empty.");
    const email = input.email.trim().toLowerCase();
    const data = { fullName: input.fullName.trim(), phone, practicePlace: input.practicePlace.trim(), source: input.source === "web" ? "web" : "app" };
    const row = await this.db.advocateInterest.upsert({ where: { email }, create: { email, ...data }, update: data });
    await this.db.auditLog.create({ data: { actorType: "PUBLIC", actorId: email, action: "ADVOCATE_INTEREST_REGISTERED", entityType: "AdvocateInterest", entityId: row.id } });
    return { registered: true };
  }

  list() {
    return this.db.advocateInterest.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  }

  async setStatus(adminId: string, id: string, status: AdvocateInterestStatus) {
    const row = await this.db.advocateInterest
      .update({ where: { id }, data: { status, ...(status === "CONTACTED" ? { contactedAt: new Date() } : {}) } })
      .catch(() => { throw new NotFoundException("Registration not found."); });
    await this.db.auditLog.create({ data: { actorType: "ADMIN", actorId: adminId, action: `ADVOCATE_INTEREST_${status}`, entityType: "AdvocateInterest", entityId: id } });
    return row;
  }
}
