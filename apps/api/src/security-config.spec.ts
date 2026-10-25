import { ConfigService } from "@nestjs/config";
import { checkProductionSecurity } from "./security-config";

const settings = (changes: Record<string, string> = {}) => new ConfigService({
  NODE_ENV: "production", JWT_SECRET: "j".repeat(48), FILE_SIGNING_SECRET: "f".repeat(48),
  WEB_ORIGIN: "https://lawmedy.example", ...changes,
});
describe("production security configuration", () => {
  it("accepts separate secrets and exact HTTPS origins", () => {
    expect(() => checkProductionSecurity(settings({ WEB_ORIGIN: "https://lawmedy.example,https://www.lawmedy.example" }))).not.toThrow();
  });
  it.each(["", "short", "replace-with-a-longer-placeholder-secret", "j".repeat(48)])("rejects a weak or reused file-signing secret", (secret) => {
    expect(() => checkProductionSecurity(settings({ FILE_SIGNING_SECRET: secret }))).toThrow("FILE_SIGNING_SECRET");
  });
  it.each(["", "*", "http://lawmedy.example", "https://lawmedy.example/path", "https://lawmedy.example/"])("rejects unsafe CORS origins", (origin) => {
    expect(() => checkProductionSecurity(settings({ WEB_ORIGIN: origin }))).toThrow("WEB_ORIGIN");
  });
  it("requires webhook recovery for live payments", () => {
    expect(() => checkProductionSecurity(settings({ RAZORPAY_KEY_ID: "rzp_live_fixture" }))).toThrow("WEBHOOK_SECRET");
  });
  it("rejects reuse of an authentication secret for credential encryption", () => {
    expect(() => checkProductionSecurity(settings({ CONFIG_ENCRYPTION_KEY: "j".repeat(48) }))).toThrow("CONFIG_ENCRYPTION_KEY");
  });
  it("allows HTTP and local secret fallback outside production", () => {
    expect(() => checkProductionSecurity(settings({ NODE_ENV: "test", WEB_ORIGIN: "http://127.0.0.1", FILE_SIGNING_SECRET: "" }))).not.toThrow();
  });
});
