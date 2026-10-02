import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
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
  constructor(private readonly config: ConfigService) {}
  settings() {
    return {
      provider: this.config.get<string>("AI_PROVIDER", "gemini"),
      modelName: this.config.get<string>("GEMINI_MODEL", "").trim(),
    };
  }
  configured() {
    const key = this.config.get<string>("GEMINI_API_KEY", "").trim();
    const { provider, modelName } = this.settings();
    return (
      provider === "gemini" &&
      !!modelName &&
      !!key &&
      !key.startsWith("replace-")
    );
  }

  // Gemini models occasionally answer 503 "high demand" or 429. Retry once, then fall
  // back to other models so a provider spike does not fail the user's step.
  private async generate(
    client: GoogleGenAI,
    params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  ) {
    const fallbacks = this.config
      .get<string>("GEMINI_FALLBACK_MODELS", "gemini-3.7-flash,gemini-3.6-flash")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const models = [params.model, ...fallbacks.filter((m) => m !== params.model)].slice(0, 3);
    let lastError: unknown;
    for (const model of models) {
      try {
        return await client.models.generateContent({ ...params, model });
      } catch (error) {
        lastError = error;
        const text = error instanceof Error ? error.message : String(error);
        const fallbackWorthy = /\b(404|429|500|502|503|504)\b|NOT_FOUND|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|timed? ?out|abort/i.test(text);
        this.logger.warn(`Gemini ${model} failed: ${text.replace(/key=[^&\s"]+/gi, "key=<redacted>").slice(0, 200)}`);
        if (!fallbackWorthy) throw error;
      }
    }
    throw lastError;
  }
  async classify(
    statement: string,
    model: string,
    matterType: "LEGAL_NOTICE" | "RTI" = "LEGAL_NOTICE",
  ) {
    const key = this.config.get<string>("GEMINI_API_KEY", "").trim();
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
          matterType === "RTI" ? RTI_SYSTEM_PROMPT : SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: modelSchema(analysisSchema),
        maxOutputTokens: 4096,
      },
    });
    return {
      text: response.text ?? "",
      raw: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  async extractEvidence(contents: Buffer, mimeType: string, model: string) {
    const key = this.config.get<string>("GEMINI_API_KEY", "").trim();
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
    });
    return {
      text: response.text ?? "",
      raw: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  async generateNotice(input: unknown, model: string, documents: SupportingDocument[] = []) {
    return this.generateJson(input, model, NOTICE_SYSTEM_PROMPT, noticeSchema, documents);
  }

  async qaNotice(input: unknown, model: string, documents: SupportingDocument[] = []) {
    return this.generateJson(
      input,
      model,
      NOTICE_QA_SYSTEM_PROMPT,
      noticeQaSchema,
      documents,
    );
  }

  async generateRti(input: unknown, model: string, documents: SupportingDocument[] = []) {
    return this.generateJson(input, model, RTI_DRAFT_SYSTEM_PROMPT, rtiSchema, documents);
  }

  async qaRti(input: unknown, model: string, documents: SupportingDocument[] = []) {
    return this.generateJson(input, model, RTI_QA_SYSTEM_PROMPT, rtiQaSchema, documents);
  }

  private async generateJson(
    input: unknown,
    model: string,
    systemInstruction: string,
    schema:
      | typeof noticeSchema
      | typeof noticeQaSchema
      | typeof rtiSchema
      | typeof rtiQaSchema,
    documents: SupportingDocument[] = [],
  ) {
    const key = this.config.get<string>("GEMINI_API_KEY", "").trim();
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
    });
    return {
      text: response.text ?? "",
      raw: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    };
  }
}
