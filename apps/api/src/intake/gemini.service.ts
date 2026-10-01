import { Injectable } from "@nestjs/common";
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

@Injectable()
export class GeminiService {
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
    const response = await client.models.generateContent({
      model,
      contents: JSON.stringify({ statement }),
      config: {
        systemInstruction:
          matterType === "RTI" ? RTI_SYSTEM_PROMPT : SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(analysisSchema),
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
    const response = await client.models.generateContent({
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
        responseJsonSchema: z.toJSONSchema(evidenceExtractionSchema),
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

  async generateNotice(input: unknown, model: string) {
    return this.generateJson(input, model, NOTICE_SYSTEM_PROMPT, noticeSchema);
  }

  async qaNotice(input: unknown, model: string) {
    return this.generateJson(
      input,
      model,
      NOTICE_QA_SYSTEM_PROMPT,
      noticeQaSchema,
    );
  }

  async generateRti(input: unknown, model: string) {
    return this.generateJson(input, model, RTI_DRAFT_SYSTEM_PROMPT, rtiSchema);
  }

  async qaRti(input: unknown, model: string) {
    return this.generateJson(input, model, RTI_QA_SYSTEM_PROMPT, rtiQaSchema);
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
  ) {
    const key = this.config.get<string>("GEMINI_API_KEY", "").trim();
    if (!this.configured()) throw new Error("AI_NOT_CONFIGURED");
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
    });
    const response = await client.models.generateContent({
      model,
      contents: JSON.stringify(input),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
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
