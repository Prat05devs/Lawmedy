import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthGuard, UserId } from "../auth.guard";
import { Roles, RolesGuard } from "../roles.guard";
import {
  AdvocateApprovalDto,
  AdvocateDraftDto,
  AdvocateRequestDto,
} from "../dto";
import { AdvocateService } from "./advocate.service";

@Controller("advocate")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADVOCATE)
export class AdvocateController {
  constructor(private readonly advocates: AdvocateService) {}

  @Get("matters")
  list(@UserId() advocateId: string) {
    return this.advocates.list(advocateId);
  }

  @Get("matters/:id")
  get(
    @UserId() advocateId: string,
    @Param("id", ParseUUIDPipe) matterId: string,
  ) {
    return this.advocates.get(advocateId, matterId);
  }

  @Post("matters/:id/draft")
  @HttpCode(200)
  edit(
    @UserId() advocateId: string,
    @Param("id", ParseUUIDPipe) matterId: string,
    @Body() dto: AdvocateDraftDto,
  ) {
    return this.advocates.editDraft(advocateId, matterId, dto);
  }

  @Post("matters/:id/request-information")
  @HttpCode(200)
  requestInformation(
    @UserId() advocateId: string,
    @Param("id", ParseUUIDPipe) matterId: string,
    @Body() dto: AdvocateRequestDto,
  ) {
    return this.advocates.requestInformation(advocateId, matterId, dto);
  }

  @Post("matters/:id/approve")
  @HttpCode(200)
  approve(
    @UserId() advocateId: string,
    @Param("id", ParseUUIDPipe) matterId: string,
    @Body() dto: AdvocateApprovalDto,
  ) {
    return this.advocates.approve(advocateId, matterId, dto.confirmed);
  }

  @Get("matters/:matterId/evidence/:evidenceId/file")
  async evidence(
    @UserId() advocateId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @Param("evidenceId", ParseUUIDPipe) evidenceId: string,
    @Res() response: Response,
  ) {
    const result = await this.advocates.evidenceFile(
      advocateId,
      matterId,
      evidenceId,
    );
    const encoded = encodeURIComponent(result.evidence.originalFilename);
    response.set({
      "Content-Type": result.evidence.mimeType,
      "Content-Length": result.contents.length.toString(),
      "Content-Disposition": `inline; filename="evidence"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.send(result.contents);
  }
}
