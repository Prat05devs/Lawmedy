import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthGuard, UserId } from "../auth.guard";
import { Roles, RolesGuard } from "../roles.guard";
import { AdvocateInterestStatusDto, TestimonialDto, AdvocateActiveDto, AdvocatePasswordDto, AssignAdvocateDto, CreateAdvocateDto, RejectPaymentDto } from "../dto";
import { AdminService } from "./admin.service";
import { RecoveryService } from "../recovery.service";
import { AdvocateInterestService } from "../advocate-interest.service";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly recovery: RecoveryService, private readonly advocateInterest: AdvocateInterestService) {}

  // Re-trigger interrupted background work now instead of waiting for the next sweep.
  @Post("recover") @HttpCode(202) recover() { void this.recovery.sweep(true); return { started: true }; }

  @Get("dashboard") dashboard() { return this.admin.dashboard(); }

  @Get("matters") matters(@Query("status") status?: string, @Query("q") q?: string) {
    return this.admin.listMatters({ status, q });
  }
  @Get("matters/:id") matter(@Param("id", ParseUUIDPipe) id: string) { return this.admin.getMatter(id); }

  @Get("matters/:id/evidence.zip")
  async zip(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const { name, contents } = await this.admin.evidenceZip(id);
    res.set({ "Content-Type": "application/zip", "Content-Length": contents.length.toString(), "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" });
    res.send(contents);
  }

  @Get("matters/:id/evidence/:evidenceId/file")
  async file(@Param("id", ParseUUIDPipe) id: string, @Param("evidenceId", ParseUUIDPipe) evidenceId: string, @Query("download") download: string | undefined, @Res() res: Response) {
    const { evidence, contents } = await this.admin.evidenceFile(id, evidenceId);
    res.set({
      "Content-Type": evidence.mimeType,
      "Content-Length": contents.length.toString(),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="file"; filename*=UTF-8''${encodeURIComponent(evidence.originalFilename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(contents);
  }

  @Post("matters/:id/assign") @HttpCode(200)
  assign(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AssignAdvocateDto) {
    return this.admin.assign(adminId, id, dto.advocateId);
  }

  @Get("payments") payments() { return this.admin.pendingPayments(); }
  @Post("payments/:id/verify") @HttpCode(200)
  verify(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string) { return this.admin.verifyPayment(adminId, id); }
  @Post("payments/:id/reject") @HttpCode(200)
  reject(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectPaymentDto) { return this.admin.rejectPayment(adminId, id, dto.note); }

  @Get("testimonials") testimonials() { return this.admin.listTestimonials(); }
  @Post("testimonials")
  createTestimonial(@UserId() adminId: string, @Body() dto: TestimonialDto) { return this.admin.saveTestimonial(adminId, null, dto); }
  @Post("testimonials/:id") @HttpCode(200)
  updateTestimonial(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: TestimonialDto) { return this.admin.saveTestimonial(adminId, id, dto); }
  @Post("testimonials/:id/delete") @HttpCode(200)
  deleteTestimonial(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string) { return this.admin.deleteTestimonial(adminId, id); }

  @Get("advocate-interest") advocateInterestList() { return this.advocateInterest.list(); }
  @Post("advocate-interest/:id/status") @HttpCode(200)
  advocateInterestStatus(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AdvocateInterestStatusDto) { return this.advocateInterest.setStatus(adminId, id, dto.status); }

  @Get("advocates") advocates() { return this.admin.advocates(); }
  @Post("advocates")
  create(@UserId() adminId: string, @Body() dto: CreateAdvocateDto) { return this.admin.createAdvocate(adminId, dto); }
  @Post("advocates/:id/active") @HttpCode(200)
  active(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AdvocateActiveDto) { return this.admin.setActive(adminId, id, dto.active); }
  @Post("advocates/:id/password") @HttpCode(200)
  password(@UserId() adminId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AdvocatePasswordDto) { return this.admin.resetPassword(adminId, id, dto.password); }
}
