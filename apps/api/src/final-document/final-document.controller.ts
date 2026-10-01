import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard, UserId } from "../auth.guard";
import { FinalDocumentService } from "./final-document.service";

@Controller("matters/:matterId/final-document")
@UseGuards(AuthGuard)
export class FinalDocumentController {
  constructor(private readonly finalDocuments: FinalDocumentService) {}

  @Get()
  get(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
  ) {
    return this.finalDocuments.get(userId, matterId);
  }

  @Post("retry")
  @HttpCode(200)
  retry(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
  ) {
    return this.finalDocuments.retry(userId, matterId);
  }

  @Get("file")
  async file(
    @UserId() userId: string,
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @Query("expires") expires: string,
    @Query("signature") signature: string,
    @Res() response: Response,
  ) {
    const result = await this.finalDocuments.file(
      userId,
      matterId,
      expires,
      signature,
    );
    const encoded = encodeURIComponent(result.finalDocument.filename);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Length": result.contents.length.toString(),
      "Content-Disposition": `attachment; filename="legal-notice.pdf"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.send(result.contents);
  }
}
