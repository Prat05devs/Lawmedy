import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import path from "node:path";
import { PrismaService } from "../prisma.service";
import { GeminiService } from "../intake/gemini.service";
import { EVIDENCE_PROMPT_VERSION, parseEvidenceExtraction } from "./extraction";
import { PrivateStorage } from "./storage.service";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

@Injectable()
export class EvidenceService {
  private readonly maxBytes: number;
  private readonly signingSecret: string;

  constructor(
    private readonly db: PrismaService,
    private readonly storage: PrivateStorage,
    private readonly gemini: GeminiService,
    config: ConfigService,
  ) {
    this.maxBytes = Number(config.get("EVIDENCE_MAX_BYTES", 10 * 1024 * 1024));
    const fileSecret = config.get<string>("FILE_SIGNING_SECRET", "").trim();
    this.signingSecret =
      fileSecret && !fileSecret.startsWith("replace-")
        ? fileSecret
        : config.get<string>("JWT_SECRET", "");
    if (this.signingSecret.length < 32)
      throw new Error("Set FILE_SIGNING_SECRET or a valid JWT_SECRET.");
  }

  private async ownedMatter(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    return matter;
  }

  private hasExpectedSignature(mimeType: string, buffer: Buffer) {
    if (mimeType === "application/pdf")
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    if (mimeType === "image/jpeg")
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    if (mimeType === "image/png")
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === "image/webp")
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    return false;
  }

  private safeFilename(filename: string) {
    const cleaned = path
      .basename(filename)
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 200);
    return cleaned || "evidence";
  }

  async upload(userId: string, matterId: string, file?: Express.Multer.File) {
    const matter = await this.ownedMatter(userId, matterId);
    if (matter.status !== "DRAFT" && matter.status !== "INTAKE_IN_PROGRESS")
      throw new ConflictException("This matter can no longer be edited.");
    if (!file) throw new BadRequestException("Choose a file to upload.");
    if (!allowedMimeTypes.has(file.mimetype))
      throw new BadRequestException("Upload a PDF, JPG, PNG, or WebP file.");
    if (!file.size) throw new BadRequestException("This file is empty. Choose another file.");
    if (file.size > this.maxBytes)
      throw new BadRequestException(
        `The file must be smaller than ${Math.floor(this.maxBytes / 1024 / 1024)} MB.`,
      );
    if (!this.hasExpectedSignature(file.mimetype, file.buffer))
      throw new BadRequestException(
        "The file contents do not match the selected file type.",
      );

    const evidenceId = randomUUID();
    const storageKey = `${matterId}/${evidenceId}`;
    await this.storage.put(storageKey, file.buffer);
    try {
      const evidence = await this.db.$transaction(async (tx) => {
        const created = await tx.evidence.create({
          data: {
            id: evidenceId,
            matterId,
            uploadedBy: userId,
            originalFilename: this.safeFilename(file.originalname),
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            sha256: createHash("sha256").update(file.buffer).digest("hex"),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "EVIDENCE_UPLOADED",
            entityType: "Evidence",
            entityId: created.id,
          },
        });
        return created;
      });
      return this.present(userId, evidence);
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async list(userId: string, matterId: string) {
    await this.ownedMatter(userId, matterId);
    const evidence = await this.db.evidence.findMany({
      where: { matterId },
      include: { extraction: true },
      orderBy: { createdAt: "desc" },
    });
    return evidence.map((item) => this.present(userId, item));
  }

  private present(
    userId: string,
    evidence: {
      id: string;
      matterId: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      status: string;
      statusMessage: string | null;
      createdAt: Date;
      extraction?: {
        extraction: Prisma.JsonValue;
        confidence: number | null;
        status: string;
      } | null;
    },
  ) {
    const expires = Math.floor(Date.now() / 1000) + 5 * 60;
    const signature = this.signature(
      userId,
      evidence.matterId,
      evidence.id,
      expires,
    );
    return {
      id: evidence.id,
      matterId: evidence.matterId,
      originalFilename: evidence.originalFilename,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      status: evidence.status,
      statusMessage: evidence.statusMessage,
      createdAt: evidence.createdAt,
      extraction: evidence.extraction ?? null,
      viewUrl: `/matters/${evidence.matterId}/evidence/${evidence.id}/file?expires=${expires}&signature=${signature}`,
    };
  }

  private signature(
    userId: string,
    matterId: string,
    evidenceId: string,
    expires: number,
  ) {
    return createHmac("sha256", this.signingSecret)
      .update(`${userId}:${matterId}:${evidenceId}:${expires}`)
      .digest("hex");
  }

  async file(
    userId: string,
    matterId: string,
    evidenceId: string,
    expiresValue: string,
    signature: string,
  ) {
    const expires = Number(expiresValue);
    if (
      !Number.isSafeInteger(expires) ||
      expires < Math.floor(Date.now() / 1000) ||
      expires > Math.floor(Date.now() / 1000) + 10 * 60
    )
      throw new BadRequestException("This file link has expired.");
    const expected = this.signature(userId, matterId, evidenceId, expires);
    const supplied = Buffer.from(signature || "", "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      supplied.length !== expectedBuffer.length ||
      !timingSafeEqual(supplied, expectedBuffer)
    )
      throw new BadRequestException("Invalid file link.");
    const evidence = await this.db.evidence.findFirst({
      where: { id: evidenceId, matterId, matter: { userId } },
    });
    if (!evidence) throw new NotFoundException("Evidence not found.");
    return { evidence, contents: await this.storage.read(evidence.storageKey) };
  }

  async retry(userId: string, matterId: string, evidenceId: string) {
    await this.ownedMatter(userId, matterId);
    const updated = await this.db.$transaction(async (tx) => {
      const result = await tx.evidence.updateMany({
        where: { id: evidenceId, matterId, status: "FAILED" },
        data: { status: "PROCESSING", statusMessage: null },
      });
      if (result.count)
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "EVIDENCE_EXTRACTION_RETRIED",
            entityType: "Evidence",
            entityId: evidenceId,
          },
        });
      return result;
    });
    if (!updated.count)
      throw new ConflictException("This file is already being processed.");
    return this.list(userId, matterId);
  }

  async process(userId: string, matterId: string, evidenceId: string) {
    const settings = this.gemini.settings();
    const evidence = await this.db.evidence.findFirst({
      where: { id: evidenceId, matterId, matter: { userId } },
    });
    if (!evidence || evidence.status !== "PROCESSING") return;
    const run = await this.db.$transaction(async (tx) => {
      const created = await tx.aiRun.create({
        data: {
          matterId,
          taskType: "EVIDENCE_EXTRACTION",
          provider: settings.provider,
          modelName: settings.modelName || "NOT_CONFIGURED",
          promptVersion: EVIDENCE_PROMPT_VERSION,
          inputReference: evidence.id,
          expiresAt: new Date(Date.now() + 120000),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          actorId: "gemini",
          action: "EVIDENCE_EXTRACTION_REQUESTED",
          entityType: "AiRun",
          entityId: created.id,
        },
      });
      return created;
    });
    const started = Date.now();
    let output: Prisma.InputJsonValue | undefined;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    try {
      const contents = await this.storage.read(evidence.storageKey);
      const response = await this.gemini.extractEvidence(
        contents,
        evidence.mimeType,
        settings.modelName,
      );
      output = {
        text: response.text,
        response: response.raw,
      } as Prisma.InputJsonValue;
      inputTokens = response.inputTokens;
      outputTokens = response.outputTokens;
      const parsed = parseEvidenceExtraction(response.text);
      await this.db.$transaction(async (tx) => {
        await tx.aiRun.update({
          where: { id: run.id },
          data: {
            status: "SUCCEEDED",
            output,
            inputTokens,
            outputTokens,
            latencyMs: Date.now() - started,
            finishedAt: new Date(),
          },
        });
        await tx.evidenceExtraction.upsert({
          where: { evidenceId },
          create: {
            evidenceId,
            aiRunId: run.id,
            model: settings.modelName,
            extraction: parsed,
            confidence: parsed.confidence,
            status: "SUCCEEDED",
          },
          update: {
            aiRunId: run.id,
            model: settings.modelName,
            extraction: parsed,
            confidence: parsed.confidence,
            status: "SUCCEEDED",
            createdAt: new Date(),
          },
        });
        await tx.evidence.update({
          where: { id: evidenceId },
          data: { status: "PROCESSED", statusMessage: null },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            actorId: "gemini",
            action: "EVIDENCE_EXTRACTION_SUCCEEDED",
            entityType: "Evidence",
            entityId: evidenceId,
          },
        });
      });
    } catch (error) {
      const code =
        error instanceof Error && error.message === "AI_NOT_CONFIGURED"
          ? "AI_NOT_CONFIGURED"
          : output
            ? "INVALID_AI_RESPONSE"
            : "AI_PROVIDER_FAILED";
      const message =
        code === "AI_NOT_CONFIGURED"
          ? "AI extraction will be available after Gemini is configured. Your file is safely stored."
          : "We could not extract details from this file. You can retry.";
      await this.db.$transaction(async (tx) => {
        await tx.aiRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            output,
            inputTokens,
            outputTokens,
            error: code,
            latencyMs: Date.now() - started,
            finishedAt: new Date(),
          },
        });
        await tx.evidenceExtraction.upsert({
          where: { evidenceId },
          create: {
            evidenceId,
            aiRunId: run.id,
            model: settings.modelName || "NOT_CONFIGURED",
            extraction: {},
            status: "FAILED",
          },
          update: {
            aiRunId: run.id,
            model: settings.modelName || "NOT_CONFIGURED",
            extraction: {},
            confidence: null,
            status: "FAILED",
            createdAt: new Date(),
          },
        });
        await tx.evidence.update({
          where: { id: evidenceId },
          data: { status: "FAILED", statusMessage: message },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            actorId: "gemini",
            action: "EVIDENCE_EXTRACTION_FAILED",
            entityType: "Evidence",
            entityId: evidenceId,
          },
        });
      });
    }
  }
}
