import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { MatterType } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "./prisma.service";
import { GeminiService } from "./intake/gemini.service";
import { parseAnalysis, PROMPT_VERSION } from "./intake/analysis";

// A free, account-less look at a case: what we understood, and what we would need. It uses the
// same analysis as the real intake, is heavily rate limited, saves nothing about the person,
// and is logged to ai_runs like every other AI call.
@Injectable()
export class QuickCheckService {
  private readonly logger = new Logger(QuickCheckService.name);
  constructor(private readonly db: PrismaService, private readonly gemini: GeminiService) {}

  async run(statement: string, type: MatterType) {
    if (!this.gemini.configured()) throw new ServiceUnavailableException("The free check is not available right now.");
    const settings = this.gemini.settings();
    const run = await this.db.aiRun.create({
      data: {
        matterId: null,
        taskType: "QUICK_CHECK",
        provider: settings.provider,
        modelName: settings.modelName,
        promptVersion: PROMPT_VERSION,
        inputReference: `quick-check:${createHash("sha256").update(statement).digest("hex").slice(0, 16)}`,
        expiresAt: new Date(Date.now() + 90_000),
      },
    });
    const started = Date.now();
    try {
      const response = await this.gemini.classify(statement, settings.modelName, type);
      const parsed = parseAnalysis(response.text, statement);
      await this.db.aiRun.update({
        where: { id: run.id },
        data: { status: "SUCCEEDED", output: { text: response.text }, inputTokens: response.inputTokens, outputTokens: response.outputTokens, latencyMs: Date.now() - started, finishedAt: new Date() },
      });
      return {
        document: type === "RTI" ? "RTI application" : "Legal notice",
        category: parsed.category,
        summary: parsed.summary,
        facts: parsed.facts.map((fact) => ({ key: fact.key, value: fact.value })),
        needed: parsed.missingInformation.map((item) => item.question),
      };
    } catch (error) {
      this.logger.warn(`Quick check failed: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}`);
      await this.db.aiRun.update({
        where: { id: run.id },
        data: { status: "FAILED", error: "AI_PROVIDER_FAILED", latencyMs: Date.now() - started, finishedAt: new Date() },
      }).catch(() => undefined);
      throw new ServiceUnavailableException("We could not check that just now. Please try again in a moment.");
    }
  }
}
