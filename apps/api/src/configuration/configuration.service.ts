import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, ProviderCredential } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma.service";
import { paymentSettings } from "../payment/settings";
import { SecretBox } from "./secret-box";
import {
  GeminiKeyDto,
  GeminiModelDto,
  RazorpayCredentialsDto,
} from "./configuration.dto";

type RazorpaySecret = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};
type GeminiSecret = { apiKey: string };
export type RuntimeRazorpay = ReturnType<typeof paymentSettings> & {
  credentialId?: string;
  environment?: string;
};
type Snapshot = {
  mode: string;
  model: string;
  fallbackModels: string[];
  rows: ProviderCredential[];
  revision: number;
};
const usable = (value: string) => !!value && !value.startsWith("replace-");
const context = (r: Pick<ProviderCredential, "id" | "provider" | "mode">) =>
  `${r.id}:${r.provider}:${r.mode}`;

@Injectable()
export class ProviderConfigurationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ProviderConfigurationService.name);
  private snapshot: Snapshot | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private refreshing?: Promise<void>;
  private readonly box: SecretBox | null;
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = config.get<string>("CONFIG_ENCRYPTION_KEY", "").trim();
    this.box = key && !key.startsWith("replace-") ? new SecretBox(key) : null;
  }
  private env(key: string, fallback = "") {
    return this.config.get<string>(key, fallback).trim();
  }
  private requireBox() {
    if (!this.box)
      throw new ServiceUnavailableException(
        "Configure CONFIG_ENCRYPTION_KEY on the API host before saving provider credentials.",
      );
    return this.box;
  }
  async onModuleInit() {
    if (!this.box) return;
    await this.bootstrap();
    await this.refresh();
    this.timer = setInterval(() => {
      void this.refresh().catch(() =>
        this.logger.error(
          "Provider configuration refresh failed; retaining the last valid configuration.",
        ),
      );
    }, 5000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  // Import .env only once, so subsequent changes are owned by the admin dashboard.
  private async bootstrap() {
    const box = this.requireBox();
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261025)`;
      if (
        await tx.providerConfiguration.findUnique({
          where: { id: "providers" },
        })
      )
        return;
      const payment = paymentSettings(this.config);
      await tx.providerConfiguration.create({
        data: {
          id: "providers",
          paymentMode:
            payment.mode === "manual"
              ? "manual"
              : payment.keyId.startsWith("rzp_live_")
                ? "live"
                : "test",
          geminiModel: this.env("GEMINI_MODEL"),
          geminiFallbackModels: this.env("GEMINI_FALLBACK_MODELS")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 2),
        },
      });
      if (payment.configured) {
        const row = {
          id: randomUUID(),
          provider: "RAZORPAY",
          mode: payment.keyId.startsWith("rzp_live_") ? "live" : "test",
        };
        await tx.providerCredential.create({
          data: {
            ...row,
            label: `Imported ${row.mode} keys`,
            ciphertext: box.seal(
              {
                keyId: payment.keyId,
                keySecret: payment.keySecret,
                webhookSecret: payment.webhookSecret,
              },
              context(row),
            ),
          },
        });
      }
      const apiKey = this.env("GEMINI_API_KEY");
      if (usable(apiKey)) {
        const row = { id: randomUUID(), provider: "GEMINI", mode: "" };
        await tx.providerCredential.create({
          data: {
            ...row,
            label: "Primary Gemini key",
            ciphertext: box.seal({ apiKey }, context(row)),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          actorId: "configuration",
          action: "PROVIDER_CONFIGURATION_INITIALIZED",
          entityType: "ProviderConfiguration",
          entityId: "providers",
        },
      });
    });
  }
  async refresh() {
    if (!this.box) return;
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      const result = await this.db.$transaction(
        async (tx) => {
          const state = await tx.providerConfiguration.findUniqueOrThrow({
            where: { id: "providers" },
          });
          const rows = await tx.providerCredential.findMany({
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          });
          return {
            mode: state.paymentMode,
            model: state.geminiModel,
            fallbackModels: state.geminiFallbackModels,
            revision: state.revision,
            rows,
          };
        },
        { isolationLevel: "RepeatableRead" },
      );
      // Fail closed on corrupt ciphertext rather than silently reverting to environment keys.
      for (const row of result.rows)
        this.box!.open(row.ciphertext, context(row));
      this.snapshot = result;
    })().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }
  razorpay(credentialId?: string): RuntimeRazorpay {
    if (!this.snapshot) return { ...paymentSettings(this.config) };
    if (!credentialId && this.snapshot.mode === "manual")
      return {
        keyId: "",
        keySecret: "",
        webhookSecret: "",
        configured: false,
        mode: "manual",
        link: this.env("PAYMENT_LINK_URL"),
      };
    const row = credentialId
      ? this.snapshot.rows.find(
          (r) => r.id === credentialId && r.provider === "RAZORPAY",
        )
      : this.snapshot.rows.find(
          (r) =>
            r.provider === "RAZORPAY" &&
            r.mode === this.snapshot!.mode &&
            !r.retired &&
            r.enabled,
        );
    if (!row)
      return {
        keyId: "",
        keySecret: "",
        webhookSecret: "",
        mode: "razorpay",
        link: "",
        configured: false,
      };
    const secret = this.box!.open<RazorpaySecret>(row.ciphertext, context(row));
    return {
      ...secret,
      credentialId: row.id,
      environment: row.mode,
      mode: "razorpay",
      link: "",
      configured:
        /^rzp_(test|live)_[A-Za-z0-9]+$/.test(secret.keyId) &&
        usable(secret.keySecret) &&
        usable(secret.webhookSecret),
    };
  }
  // Archived versions remain available only for orders created with them.
  razorpayVersions(): RuntimeRazorpay[] {
    const stored =
      this.snapshot?.rows
        .filter((r) => r.provider === "RAZORPAY")
        .map((r) => this.razorpay(r.id)) ?? [];
    const legacy = paymentSettings(this.config);
    return [
      ...stored,
      ...(legacy.configured || usable(legacy.webhookSecret) ? [legacy] : []),
    ];
  }
  gemini() {
    const keys = this.snapshot
      ? this.snapshot.rows
          .filter((r) => r.provider === "GEMINI" && r.enabled && !r.retired)
          .map((r) => ({
            id: r.id,
            ...this.box!.open<GeminiSecret>(r.ciphertext, context(r)),
          }))
      : usable(this.env("GEMINI_API_KEY"))
        ? [{ id: "environment", apiKey: this.env("GEMINI_API_KEY") }]
        : [];
    return {
      model: this.snapshot?.model ?? this.env("GEMINI_MODEL"),
      fallbackModels:
        this.snapshot?.fallbackModels ??
        this.env("GEMINI_FALLBACK_MODELS").split(",").filter(Boolean),
      keys,
    };
  }
  async summary() {
    await this.refresh();
    const rows = this.snapshot?.rows.filter((r) => !r.retired) ?? [];
    const payments = ["live", "test"].map((mode) => {
      const row = rows.find(
        (r) => r.provider === "RAZORPAY" && r.mode === mode,
      );
      const value = row ? this.razorpay(row.id) : null;
      return {
        mode,
        configured: !!value?.configured,
        keyHint: value?.keyId ? `…${value.keyId.slice(-4)}` : null,
        hasKeySecret: !!value?.keySecret,
        hasWebhookSecret: !!value?.webhookSecret,
        updatedAt: row?.updatedAt ?? null,
      };
    });
    return {
      editable: !!this.box,
      revision: this.snapshot?.revision ?? 0,
      paymentMode:
        this.snapshot?.mode ??
        (this.env("RAZORPAY_KEY_ID").startsWith("rzp_live_") ? "live" : "test"),
      razorpay: payments,
      gemini: {
        model: this.gemini().model,
        fallbackModels: this.gemini().fallbackModels,
        keys: rows
          .filter((r) => r.provider === "GEMINI")
          .map((r) => ({
            id: r.id,
            label: r.label,
            enabled: r.enabled,
            priority: r.priority,
            updatedAt: r.updatedAt,
          })),
      },
      audit: await this.db.auditLog.findMany({
        where: { entityType: "ProviderConfiguration" },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, action: true, createdAt: true },
      }),
    };
  }
  private async mutate(
    adminId: string,
    revision: number,
    action: string,
    work: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    this.requireBox();
    await this.db.$transaction(async (tx) => {
      const changed = await tx.providerConfiguration.updateMany({
        where: { id: "providers", revision },
        data: { revision: { increment: 1 } },
      });
      if (!changed.count)
        throw new ConflictException(
          "Configuration changed in another session. Reload and try again.",
        );
      await work(tx);
      await tx.auditLog.create({
        data: {
          actorType: "ADMIN",
          actorId: adminId,
          action,
          entityType: "ProviderConfiguration",
          entityId: "providers",
        },
      });
    });
    await this.refreshing;
    await this.refresh();
    return { saved: true };
  }
  async saveRazorpay(
    adminId: string,
    mode: string,
    input: RazorpayCredentialsDto,
  ) {
    this.requireBox();
    if (mode !== "live" && mode !== "test")
      throw new BadRequestException("Choose live or test mode.");
    await this.refresh();
    const current = this.snapshot?.rows.find(
      (r) => r.provider === "RAZORPAY" && r.mode === mode && !r.retired,
    );
    const previous = current ? this.razorpay(current.id) : null;
    const value = {
      keyId: input.keyId ?? previous?.keyId ?? "",
      keySecret: input.keySecret ?? previous?.keySecret ?? "",
      webhookSecret: input.webhookSecret ?? previous?.webhookSecret ?? "",
    };
    if (
      !value.keyId.startsWith(`rzp_${mode}_`) ||
      !usable(value.keySecret) ||
      !usable(value.webhookSecret)
    )
      throw new BadRequestException(
        "Supply the matching Key ID, Key Secret and Webhook Secret for this mode.",
      );
    const row = { id: randomUUID(), provider: "RAZORPAY", mode };
    const ciphertext = this.requireBox().seal(value, context(row));
    return this.mutate(
      adminId,
      this.snapshot!.revision,
      `RAZORPAY_${mode.toUpperCase()}_CREDENTIALS_UPDATED`,
      async (tx) => {
        await tx.providerCredential.updateMany({
          where: { provider: "RAZORPAY", mode, retired: false },
          data: { retired: true },
        });
        await tx.providerCredential.create({
          data: { ...row, label: `${mode} keys`, ciphertext },
        });
      },
    );
  }
  async setPaymentMode(adminId: string, mode: "live" | "test") {
    this.requireBox();
    await this.refresh();
    const row = this.snapshot?.rows.find(
      (r) =>
        r.provider === "RAZORPAY" && r.mode === mode && !r.retired && r.enabled,
    );
    if (!row || !this.razorpay(row.id).configured)
      throw new BadRequestException(
        "Save complete credentials for this mode before activating it.",
      );
    return this.mutate(
      adminId,
      this.snapshot!.revision,
      `RAZORPAY_MODE_CHANGED_TO_${mode.toUpperCase()}`,
      async (tx) => {
        await tx.providerConfiguration.update({
          where: { id: "providers" },
          data: { paymentMode: mode },
        });
      },
    );
  }
  async saveGemini(adminId: string, id: string | null, input: GeminiKeyDto) {
    this.requireBox();
    await this.refresh();
    const current = id
      ? this.snapshot?.rows.find(
          (r) => r.id === id && r.provider === "GEMINI" && !r.retired,
        )
      : null;
    if (id && !current) throw new NotFoundException("Gemini key not found.");
    if (
      !id &&
      (this.snapshot?.rows.filter((r) => r.provider === "GEMINI" && !r.retired)
        .length ?? 0) >= 20
    )
      throw new BadRequestException("Up to 20 Gemini keys can be configured.");
    const apiKey =
      input.apiKey ??
      (current
        ? this.requireBox().open<GeminiSecret>(
            current.ciphertext,
            context(current),
          ).apiKey
        : "");
    if (!usable(apiKey))
      throw new BadRequestException("Enter a Gemini API key.");
    const row = { id: id ?? randomUUID(), provider: "GEMINI", mode: "" };
    const ciphertext = this.requireBox().seal({ apiKey }, context(row));
    return this.mutate(
      adminId,
      this.snapshot!.revision,
      id ? "GEMINI_KEY_UPDATED" : "GEMINI_KEY_ADDED",
      async (tx) => {
        await tx.providerCredential.upsert({
          where: { id: row.id },
          create: {
            ...row,
            label: input.label,
            priority: input.priority,
            enabled: input.enabled,
            ciphertext,
          },
          update: {
            label: input.label,
            priority: input.priority,
            enabled: input.enabled,
            ciphertext,
          },
        });
      },
    );
  }
  async saveModel(adminId: string, input: GeminiModelDto) {
    this.requireBox();
    await this.refresh();
    return this.mutate(
      adminId,
      this.snapshot!.revision,
      "GEMINI_MODEL_UPDATED",
      async (tx) => {
        await tx.providerConfiguration.update({
          where: { id: "providers" },
          data: {
            geminiModel: input.model,
            geminiFallbackModels: [...new Set(input.fallbackModels)].filter(
              (m) => m !== input.model,
            ),
          },
        });
      },
    );
  }
  async beginAttempt(
    model: string,
    keyId: string,
    inputReference: string,
    parentRunId?: string,
  ) {
    if (!parentRunId) throw new Error("AI_CONTEXT_REQUIRED");
    return this.db.$transaction(async (tx) => {
      const parent = await tx.aiRun.findUnique({ where: { id: parentRunId } });
      if (!parent || parent.status !== "RUNNING")
        throw new Error("AI_CONTEXT_UNAVAILABLE");
      if (parent.matterId) {
        const matter = await tx.matter.findUnique({
          where: { id: parent.matterId },
          select: { user: { select: { active: true } } },
        });
        if (!matter?.user.active) throw new Error("AI_CONTEXT_UNAVAILABLE");
      }
      return tx.aiRun.create({
        data: {
          parentRunId: parent.id,
          matterId: parent.matterId,
          taskType: "PROVIDER_ATTEMPT",
          provider: "gemini",
          modelName: model,
          promptVersion: parent.promptVersion,
          inputReference: `${inputReference};credential:${keyId}`,
          expiresAt: parent.expiresAt,
        },
      });
    });
  }
  async finishAttempt(
    id: string,
    result: {
      text?: string;
      usageMetadata?: {
        promptTokenCount?: number | null;
        candidatesTokenCount?: number | null;
      };
    } | null,
    started: number,
    code?: string,
  ) {
    await this.db.aiRun.update({
      where: { id },
      data: {
        status: result ? "SUCCEEDED" : "FAILED",
        finishedAt: new Date(),
        latencyMs: Date.now() - started,
        output: result ? { text: result.text ?? "" } : undefined,
        inputTokens: result?.usageMetadata?.promptTokenCount ?? null,
        outputTokens: result?.usageMetadata?.candidatesTokenCount ?? null,
        error: code ?? null,
      },
    });
  }
}
