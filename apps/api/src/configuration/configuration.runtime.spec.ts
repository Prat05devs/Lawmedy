import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";
import { ProviderConfigurationService } from "./configuration.service";

describe("Provider configuration compatibility", () => {
  it("keeps environment-based settings working before dashboard initialization", () => {
    const settings = new ProviderConfigurationService(
      {} as never,
      new ConfigService({
        RAZORPAY_KEY_ID: "rzp_live_fixture",
        RAZORPAY_KEY_SECRET: "fixture-secret",
        GEMINI_MODEL: "fixture-model",
        GEMINI_API_KEY: "fixture-google-key",
      }),
    );
    expect(settings.razorpay().keyId).toBe("rzp_live_fixture");
    expect(settings.gemini().keys[0].apiKey).toBe("fixture-google-key");
  });
  it("preserves manual payments until an admin explicitly selects online mode", () => {
    const settings = new ProviderConfigurationService(
      {} as never,
      new ConfigService({
        PAYMENT_MODE: "manual",
        PAYMENT_LINK_URL: "https://payments.example.test",
      }),
    );
    settings["snapshot"] = {
      mode: "manual",
      model: "",
      fallbackModels: [],
      rows: [],
      revision: 1,
    };
    expect(settings.razorpay()).toMatchObject({
      mode: "manual",
      link: "https://payments.example.test",
    });
    expect(settings.razorpay("unknown-credential").configured).toBe(false);
  });
  it("refuses credential writes without an encryption key before touching the database", async () => {
    const db = { $transaction: jest.fn() };
    const settings = new ProviderConfigurationService(
      db as never,
      new ConfigService({ CONFIG_ENCRYPTION_KEY: "" }),
    );
    await expect(
      settings.saveModel("admin", { model: "fixture", fallbackModels: [] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
