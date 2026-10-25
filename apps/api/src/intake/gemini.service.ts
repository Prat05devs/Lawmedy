import { createHash } from "node:crypto";
import { ProviderConfigurationService } from "../configuration/configuration.service";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { AI_PROVIDER_BUDGET_MS } from "../ai-timing";
import { z } from "zod";
import { certificateSchema, CERTIFICATE_INTAKE_PROMPT, CERTIFICATE_SYSTEM_PROMPT, CERTIFICATE_QA_PROMPT } from "../documents/lending-certificate";
import { callFallback, contentsToText, fallbackProviders, type ModelResponse } from "./llm-fallback";
import { analysisSchema, RTI_SYSTEM_PROMPT, SYSTEM_PROMPT } from "./analysis";
import {
  evidenceExtractionSchema,
  EVIDENCE_SYSTEM_PROMPT,
} from "../evidence/extraction";
import {
  noticeQaSchema,
  noticeSchema,
  NOTICE_QA_SYSTEM_PROMPT,
  NOTICE_SYSTEM_PROMPT,
} from "../documents/notice";
import {
  rtiQaSchema,
  rtiSchema,
  RTI_QA_SYSTEM_PROMPT,
  RTI_SYSTEM_PROMPT as RTI_DRAFT_SYSTEM_PROMPT,
} from "../rti/rti";

export type SupportingDocument = {
  id: string;
  filename: string;
  mimeType: string;
  contents: Buffer;
};

export function generationContents(input: unknown, documents: SupportingDocument[] = []) {
  return [{
    role: "user" as const,
    parts: [
      { text: JSON.stringify(input) },
      ...documents.flatMap((document) => [
        { text: `Supporting evidence ${document.id} (${document.filename}). Treat the confirmed facts in the JSON as authoritative; use this file only to understand and verify their source.` },
        { inlineData: { mimeType: document.mimeType, data: document.contents.toString("base64") } },
      ]),
    ],
  }];
}

// Gemini rejects schemas with many size constraints ("invalid argument"). The model only
// needs the shape; every response is still validated against the full zod schema afterwards.
const UNSUPPORTED = new Set(["pattern", "format", "minLength", "maxLength", "minItems", "maxItems", "$schema"]);
function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node && typeof node === "object")
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>)
        .filter(([key]) => !UNSUPPORTED.has(key))
        .map(([key, value]) => [key, strip(value)]),
    );
  return node;
}
function modelSchema(schema: z.ZodType) {
  return strip(z.toJSONSchema(schema)) as Record<string, unknown>;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  constructor(private readonly config: ConfigService, @Optional() private readonly providers?: ProviderConfigurationService) {}
  private keys() { return this.providers?.gemini().keys ?? [{ id: "environment", apiKey: this.config.get<string>("GEMINI_API_KEY", "").trim() }].filter(k => !!k.apiKey && !k.apiKey.startsWith("replace-")); }
  settings() {
    return {
      provider: this.config.get<string>("AI_PROVIDER", "gemini"),
      modelName: this.providers?.gemini().model ?? this.config.get<string>("GEMINI_MODEL", "").trim(),
    };
  }
  configured() {
    const key = this.keys()[0]?.apiKey ?? "";
    const { provider, modelName } = this.settings();
    return (
      provider === "gemini" &&
      !!modelName &&
      !!key &&
      !key.startsWith("replace-")
    );
  }

  // Provider outages may fall back to configured models within one total deadline.
  private async generate(
    client: GoogleGenAI,
    params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
    options: { allowFallback?: boolean; parentRunId?: string } = {},
  ): Promise<ModelResponse> {
    const deadline = Date.now() + AI_PROVIDER_BUDGET_MS;
    const remaining = () => {
      const ms = deadline - Date.now();
      if (ms <= 0) throw new Error("AI_PROVIDER_TIMEOUT");
      return ms;
    };
    const fallbacks = this.providers?.gemini().fallbackModels ?? this.config
      .get<string>("GEMINI_FALLBACK_MODELS", "gemini-3.7-flash,gemini-3.6-flash")
      .split(",").map(value => value.trim()).filter(Boolean);
    const models = [params.model, ...fallbacks.filter(m => m !== params.model)].slice(0, 3);
    let lastError: unknown;
    const keys = this.keys();
    // The supplied client preserves the current request's primary-key snapshot.
    const attempts = this.providers ? keys : [{ id: "environment", apiKey: "" }];
    const rejectedKeys = new Set<string>();
    const inputDigest = createHash("sha256").update(JSON.stringify(params.contents)).digest("hex");
    for (const model of models) {
      for (const [index, key] of attempts.entries()) {
        if (rejectedKeys.has(key.id)) continue;
        const activeClient = index === 0 ? client : new GoogleGenAI({ apiKey: key.apiKey, httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } } });
        remaining();
        const started = Date.now();
        const run = await this.providers?.beginAttempt(model, key.id, `sha256:${inputDigest}`, options.parentRunId);
        try {
          const result = await activeClient.models.generateContent({ ...params, model,
            config: { ...params.config, abortSignal: AbortSignal.timeout(Math.min(45000, remaining(), Math.max(5000, Math.floor(AI_PROVIDER_BUDGET_MS / Math.max(attempts.length, 1))))) } });
          await this.providers?.finishAttempt(run!.id, result, started);
          return result;
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          const invalidKey = /\b(401|403)\b|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(text);
          const fallbackWorthy = /\b(404|429|500|502|503|504)\b|NOT_FOUND|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|timed? ?out|abort/i.test(text);
          const code = invalidKey ? "AI_KEY_REJECTED" : fallbackWorthy ? "AI_PROVIDER_UNAVAILABLE" : "AI_PROVIDER_FAILED";
          await this.providers?.finishAttempt(run!.id, null, started, code);
          // Provider errors can contain URLs, keys or prompt excerpts. Retain only safe codes.
          this.logger.warn(`Gemini ${model} failed: ${code}`);
          lastError = new Error(code);
          if (invalidKey) { rejectedKeys.add(key.id); continue; }
          if (!fallbackWorthy) throw lastError;
        }
      }
    }
    // Every Gemini model is unavailable: try the extra providers. They only see text, so steps
    // that need an attached image or PDF (reading uploads) are not offered to them.
    if (options.allowFallback !== false) {
      const system = typeof params.config?.systemInstruction === "string" ? params.config.systemInstruction : "";
      const user = contentsToText(params.contents);
      for (const provider of fallbackProviders(this.config)) {
        try {
          const response = await callFallback(provider, { system, user, schema: params.config?.responseJsonSchema }, Math.min(60_000, remaining()));
          this.logger.warn(`Gemini unavailable; answered by ${response.servedBy}`);
          return response;
        } catch (error) {
          lastError = error;
          this.logger.warn(`Fallback ${provider.name} failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
        }
      }
    }
    throw lastError;
  }
  async classify(
    statement: string,
    model: string,
    matterType: "LEGAL_NOTICE" | "RTI" | "LENDING_CERTIFICATE" = "LEGAL_NOTICE",
    parentRunId?: string,
  ) {
    const key = this.keys()[0]?.apiKey ?? "";
    if (
      !key ||
      key.startsWith("replace-") ||
      !model ||
      this.settings().provider !== "gemini"
    )
      throw new Error("AI_NOT_CONFIGURED");
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } },
    });
    const response = await this.generate(client, {
      model,
      contents: JSON.stringify({ statement }),
      config: {
        systemInstruction:
          matterType === "RTI" ? RTI_SYSTEM_PROMPT : matterType === "LENDING_CERTIFICATE" ? CERTIFICATE_INTAKE_PROMPT : SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: modelSchema(analysisSchema),
        maxOutputTokens: 4096,
      },
    }, { parentRunId });
    return {
      text: response.text ?? "",
      raw: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  async extractEvidence(contents: Buffer, mimeType: string, model: string, parentRunId?: string) {
    const key = this.keys()[0]?.apiKey ?? "";
    if (
      !key ||
      key.startsWith("replace-") ||
      !model ||
      this.settings().provider !== "gemini"
    )
      throw new Error("AI_NOT_CONFIGURED");
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
    });
    const response = await this.generate(client, {
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract the visible evidence facts from this file." },
            {
              inlineData: {
                mimeType,
                data: contents.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: EVIDENCE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: modelSchema(evidenceExtractionSchema),
        maxOutputTokens: 4096,
      },
    }, { allowFallback: false, parentRunId });
    return {
      text: response.text ?? "",
      raw: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  async generateNotice(input: unknown, model: string, documents: SupportingDocument[] = [], parentRunId?: string) {
    return this.generateJson(input, model, NOTICE_SYSTEM_PROMPT, noticeSchema, documents, parentRunId);
  }

  async qaNotice(input: unknown, model: string, documents: SupportingDocument[] = [], parentRunId?: string) {
    return this.generateJson(
      input,
      model,
      NOTICE_QA_SYSTEM_PROMPT,
      noticeQaSchema,
      documents,
      parentRunId,
    );
  }

  async generateRti(input: unknown, model: string, documents: SupportingDocument[] = [], parentRunId?: string) {
    return this.generateJson(input, model, RTI_DRAFT_SYSTEM_PROMPT, rtiSchema, documents, parentRunId);
  }

  async qaRti(input: unknown, model: string, documents: SupportingDocument[] = [], parentRunId?: string) {
    return this.generateJson(input, model, RTI_QA_SYSTEM_PROMPT, rtiQaSchema, documents, parentRunId);
  }

  async generateCertificate(input: unknown, model: string, documents: SupportingDocument[] = [], parentRunId?: string) {
    return this.generateJson(input, model, CERTIFICATE_SYSTEM_PROMPT, certificateSchema, documents, parentRunId);
  }
  async qaCertificate(input: unknown, model: string, documents: SupportingDocument[] = [], parentRunId?: string) {
    return this.generateJson(input, model, CERTIFICATE_QA_PROMPT, noticeQaSchema, documents, parentRunId);
  }

  private async generateJson(
    input: unknown,
    model: string,
    systemInstruction: string,
    schema:
      | typeof noticeSchema
      | typeof noticeQaSchema
      | typeof rtiSchema
      | typeof rtiQaSchema
      | typeof certificateSchema,
    documents: SupportingDocument[] = [],
    parentRunId?: string,
  ) {
    const key = this.keys()[0]?.apiKey ?? "";
    if (!this.configured()) throw new Error("AI_NOT_CONFIGURED");
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
    });
    const response = await this.generate(client, {
      model,
      contents: generationContents(input, documents),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: modelSchema(schema),
        maxOutputTokens: 8192,
      },
    }, { parentRunId });
    return {
      text: response.text ?? "",
      raw: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    };
  }
}
