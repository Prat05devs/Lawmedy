import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { PrismaService } from "../prisma.service";
import { noticeSchema } from "../documents/notice";
import { rtiSchema } from "../rti/rti";
import { PrivateStorage } from "../evidence/storage.service";
import { TransactionalEmailService } from "./email.service";
import { renderLegalNoticeHtml } from "./legal-notice-template";
import { renderRtiHtml } from "./rti-template";
import { PdfRendererService } from "./pdf-renderer.service";

@Injectable()
export class FinalDocumentService {
  private readonly signingSecret: string;
  private readonly webOrigin: string;

  constructor(
    private readonly db: PrismaService,
    private readonly storage: PrivateStorage,
    private readonly renderer: PdfRendererService,
    private readonly email: TransactionalEmailService,
    config: ConfigService,
  ) {
    const fileSecret = config.get<string>("FILE_SIGNING_SECRET", "").trim();
    this.signingSecret =
      fileSecret && !fileSecret.startsWith("replace-")
        ? fileSecret
        : config.get<string>("JWT_SECRET", "");
    if (this.signingSecret.length < 32)
      throw new Error("Set FILE_SIGNING_SECRET or a valid JWT_SECRET.");
    // WEB_ORIGIN may list several origins; links in emails use the first (the main site).
    this.webOrigin = config
      .get<string>("WEB_ORIGIN", "http://localhost:3000")
      .split(",")[0]
      .trim()
      .replace(/\/$/, "");
  }

  async generateAndDeliver(matterId: string) {
    const existing = await this.db.finalDocument.findUnique({
      where: { matterId },
    });
    if (existing) return existing;

    const matter = await this.db.matter.findUnique({
      where: { id: matterId },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        documents: {
          include: { reviewedBy: { select: { fullName: true } } },
        },
      },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.status !== "APPROVED")
      throw new ConflictException("The document must be approved first.");
    const document = matter.documents.find((item) => item.documentType === (matter.type === "RTI" ? "RTI" : "LEGAL_NOTICE"));
    if (!document) throw new ConflictException("The approved draft was not found.");
    if (matter.type === "LEGAL_NOTICE" && (!document.reviewedAt || !document.reviewedBy))
      throw new ConflictException("The advocate review is incomplete.");
    const version = await this.db.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId: document.id,
          versionNumber: document.currentVersion,
        },
      },
    });
    if (!version) throw new ConflictException("The approved draft was not found.");
    const html = matter.type === "RTI"
      ? (() => { const parsed = rtiSchema.safeParse(version.content); if (!parsed.success || parsed.data.status !== "READY") throw new ConflictException("The approved draft is invalid."); return renderRtiHtml({ referenceNumber: matter.referenceNumber, issuedAt: new Date(), content: parsed.data }); })()
      : (() => { const parsed = noticeSchema.safeParse(version.content); if (!parsed.success || parsed.data.status !== "READY") throw new ConflictException("The approved draft is invalid."); return renderLegalNoticeHtml({ referenceNumber: matter.referenceNumber, issuedAt: document.reviewedAt!, reviewedBy: document.reviewedBy!.fullName, content: parsed.data }); })();
    const pdf = await this.renderer.render(html);
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-")
      throw new Error("INVALID_PDF_OUTPUT");

    const finalId = randomUUID();
    const storageKey = `${matter.id}/${finalId}`;
    const filename = `${matter.referenceNumber}-${matter.type === "RTI" ? "rti-application" : "legal-notice"}.pdf`;
    await this.storage.put(storageKey, pdf);
    let finalDocument;
    try {
      finalDocument = await this.db.$transaction(async (tx) => {
        const created = await tx.finalDocument.create({
          data: {
            id: finalId,
            matterId: matter.id,
            documentVersionId: version.id,
            storageKey,
            filename,
            sizeBytes: pdf.length,
            sha256: createHash("sha256").update(pdf).digest("hex"),
            renderedHtml: html,
          },
        });
        await tx.matter.update({
          where: { id: matter.id },
          data: { status: "COMPLETED" },
        });
        await tx.notification.create({
          data: {
            userId: matter.user.id,
            matterId: matter.id,
            title: matter.type === "RTI" ? "Your RTI Application is Ready" : "Your Legal Notice is Ready",
            message: matter.type === "RTI" ? "Your RTI PDF is ready to download." : "Your advocate-reviewed PDF is ready to download.",
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            actorId: "lawmedy",
            action: "FINAL_DOCUMENT_GENERATED",
            entityType: "FinalDocument",
            entityId: created.id,
          },
        });
        return created;
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }

    await this.deliver(finalDocument.id, {
      to: matter.user.email,
      fullName: matter.user.fullName,
      referenceNumber: matter.referenceNumber,
      matterUrl: `${this.webOrigin}/matters/${matter.id}`,
      documentLabel: matter.type === "RTI" ? "RTI application" : "legal notice",
    });
    return this.db.finalDocument.findUniqueOrThrow({
      where: { id: finalDocument.id },
    });
  }

  private async deliver(
    finalDocumentId: string,
    input: {
      to: string;
      fullName: string;
      referenceNumber: string;
      matterUrl: string;
      documentLabel: string;
    },
  ) {
    try {
      const result = await this.email.sendReady(input);
      await this.db.$transaction([
        this.db.finalDocument.update({
          where: { id: finalDocumentId },
          data:
            result.status === "SENT"
              ? {
                  deliveryStatus: "SENT",
                  providerMessageId: result.id,
                  emailedAt: new Date(),
                  deliveryError: null,
                }
              : { deliveryStatus: "SKIPPED_CONFIGURATION" },
        }),
        this.db.auditLog.create({
          data: {
            actorType: "SYSTEM",
            actorId: "lawmedy",
            action:
              result.status === "SENT"
                ? "FINAL_DOCUMENT_EMAIL_SENT"
                : "FINAL_DOCUMENT_EMAIL_SKIPPED",
            entityType: "FinalDocument",
            entityId: finalDocumentId,
          },
        }),
      ]);
    } catch (error) {
      const code =
        error instanceof Error && /^EMAIL_[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "EMAIL_DELIVERY_FAILED";
      await this.db.finalDocument.update({
        where: { id: finalDocumentId },
        data: { deliveryStatus: "FAILED", deliveryError: code },
      });
    }
  }

  async get(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      include: { finalDocument: true },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (!matter.finalDocument)
      return {
        state: matter.status === "APPROVED" ? "PENDING" : "NOT_READY",
        matterStatus: matter.status,
      };
    const expires = Math.floor(Date.now() / 1000) + 5 * 60;
    const signature = this.signature(
      userId,
      matterId,
      matter.finalDocument.id,
      expires,
    );
    return {
      state: "READY",
      matterStatus: matter.status,
      filename: matter.finalDocument.filename,
      sizeBytes: matter.finalDocument.sizeBytes,
      generatedAt: matter.finalDocument.generatedAt,
      deliveryStatus: matter.finalDocument.deliveryStatus,
      downloadUrl: `/final/${matterId}?expires=${expires}&signature=${signature}`,
    };
  }

  async retry(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      select: { status: true },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.status !== "APPROVED")
      throw new ConflictException("The final document is not awaiting generation.");
    await this.generateAndDeliver(matterId);
    return this.get(userId, matterId);
  }

  private signature(
    userId: string,
    matterId: string,
    finalDocumentId: string,
    expires: number,
  ) {
    return createHmac("sha256", this.signingSecret)
      .update(`${userId}:${matterId}:${finalDocumentId}:${expires}`)
      .digest("hex");
  }

  async file(
    userId: string,
    matterId: string,
    expiresValue: string,
    suppliedSignature: string,
  ) {
    const expires = Number(expiresValue);
    if (
      !Number.isSafeInteger(expires) ||
      expires < Math.floor(Date.now() / 1000) ||
      expires > Math.floor(Date.now() / 1000) + 10 * 60
    )
      throw new BadRequestException("This download link has expired.");
    const finalDocument = await this.db.finalDocument.findFirst({
      where: { matterId, matter: { userId } },
    });
    if (!finalDocument) throw new NotFoundException("Final document not found.");
    const expected = this.signature(userId, matterId, finalDocument.id, expires);
    const supplied = Buffer.from(suppliedSignature || "", "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      supplied.length !== expectedBuffer.length ||
      !timingSafeEqual(supplied, expectedBuffer)
    )
      throw new BadRequestException("Invalid download link.");
    const contents = await this.storage.read(finalDocument.storageKey);
    await this.db.auditLog.create({
      data: {
        actorType: "USER",
        actorId: userId,
        action: "FINAL_DOCUMENT_DOWNLOADED",
        entityType: "FinalDocument",
        entityId: finalDocument.id,
      },
    });
    return { finalDocument, contents };
  }
}
