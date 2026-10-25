import { ConfigService } from "@nestjs/config";
import { GeminiService } from "./gemini.service";

describe("AI attempt ownership propagation", () => {
  it.each([
    "generateNotice",
    "qaNotice",
    "generateRti",
    "qaRti",
    "generateCertificate",
    "qaCertificate",
  ] as const)("preserves the owning parent for %s", async (method) => {
    const service = new GeminiService(new ConfigService());
    const generate = jest
      .spyOn(service as never, "generateJson")
      .mockResolvedValue({} as never);
    await service[method]({ fixture: true }, "fixture-model", [], "parent-run");
    expect(generate).toHaveBeenCalledWith(
      expect.anything(),
      "fixture-model",
      expect.any(String),
      expect.anything(),
      [],
      "parent-run",
    );
  });
});
