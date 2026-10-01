import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { AuthGuard, UserId } from "../auth.guard";
import { EvidenceService } from "./evidence.service";

@Controller("matters/:matterId/evidence")
@UseGuards(AuthGuard)
export class EvidenceController {
  private readonly logger = new Logger(EvidenceController.name);
  constructor(private readonly evidence: EvidenceService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const evidence = await this.evidence.upload(userId, matterId, file);
    setImmediate(() => {
      void this.evidence
        .process(userId, matterId, evidence.id)
        .catch((error: unknown) =>
          this.logger.error("Evidence processing could not start", error),
        );
    });
    return evidence;
  }

  @Get()
  list(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
  ) {
    return this.evidence.list(userId, matterId);
  }

  @Post(":evidenceId/retry")
  @HttpCode(200)
  async retry(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @Param("evidenceId", ParseUUIDPipe) evidenceId: string,
  ) {
    const result = await this.evidence.retry(userId, matterId, evidenceId);
    setImmediate(() => {
      void this.evidence
        .process(userId, matterId, evidenceId)
        .catch((error: unknown) =>
          this.logger.error("Evidence processing could not restart", error),
        );
    });
    return result;
  }

  @Get(":evidenceId/file")
  async file(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @Param("evidenceId", ParseUUIDPipe) evidenceId: string,
    @Query("expires") expires: string,
    @Query("signature") signature: string,
    @Res() response: Response,
  ) {
    const result = await this.evidence.file(
      userId,
      matterId,
      evidenceId,
      expires,
      signature,
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
