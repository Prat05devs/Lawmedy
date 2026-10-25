import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { GeminiService } from "./gemini.service";
jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn() }));

describe("Gemini credential backup", () => {
  function setup(primaryError: string) {
    const primary = jest.fn().mockRejectedValue(new Error(primaryError));
    const backup = jest
      .fn()
      .mockResolvedValue({
        text: '{"summary":"fixture"}',
        usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4 },
      });
    const clients: Record<string, typeof primary> = {
      "primary-fixture-key": primary,
      "backup-fixture-key": backup,
    };
    (GoogleGenAI as jest.Mock).mockImplementation(
      ({ apiKey }: { apiKey: string }) => ({
        models: { generateContent: clients[apiKey] },
      }),
    );
    const providers = {
      gemini: () => ({
        model: "fixture-model",
        fallbackModels: [],
        keys: [
          { id: "primary", apiKey: "primary-fixture-key" },
          { id: "backup", apiKey: "backup-fixture-key" },
        ],
      }),
      beginAttempt: jest.fn(async () => ({ id: "attempt-id" })),
      finishAttempt: jest.fn().mockResolvedValue(undefined),
    };
    const service = new GeminiService(
      new ConfigService({ AI_PROVIDER: "gemini", AI_FALLBACK_PROVIDERS: "" }),
      providers as never,
    );
    return { service, providers, primary, backup };
  }
  beforeEach(() => jest.clearAllMocks());
  it.each([
    "403 API_KEY_INVALID secret=primary-fixture-key",
    "429 RESOURCE_EXHAUSTED",
    "503 UNAVAILABLE",
  ])("uses and logs the backup after %s", async (error) => {
    const { service, providers, primary, backup } = setup(error);
    const result = await service.classify(
      "Fixture statement only",
      "fixture-model",
    );
    expect(result.text).toContain("fixture");
    expect(primary).toHaveBeenCalledTimes(1);
    expect(backup).toHaveBeenCalledTimes(1);
    expect(
      providers.beginAttempt.mock.calls.map((args) => args.slice(0, 2)),
    ).toEqual([
      ["fixture-model", "primary"],
      ["fixture-model", "backup"],
    ]);
    expect(providers.finishAttempt).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(providers.finishAttempt.mock.calls)).not.toContain(
      "primary-fixture-key",
    );
  });
  it("does not retry invalid prompts across backup credentials", async () => {
    const { service, backup } = setup("400 INVALID_ARGUMENT");
    await expect(
      service.classify("Fixture statement", "fixture-model"),
    ).rejects.toThrow("AI_PROVIDER_FAILED");
    expect(backup).not.toHaveBeenCalled();
  });
});
