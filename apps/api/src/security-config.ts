import { ConfigService } from "@nestjs/config";
export function checkProductionSecurity(config: ConfigService) {
  if (config.get("NODE_ENV") !== "production") return;
  const value = (key: string) => config.get<string>(key, "").trim();
  const fileSecret = value("FILE_SIGNING_SECRET");
  const encryptionKey = value("CONFIG_ENCRYPTION_KEY");
  if (encryptionKey && !encryptionKey.startsWith("replace-") && [fileSecret, value("JWT_SECRET")].includes(encryptionKey))
    throw new Error("CONFIG_ENCRYPTION_KEY must be separate from JWT_SECRET and FILE_SIGNING_SECRET.");
  if (fileSecret.length < 32 || fileSecret.startsWith("replace-") || fileSecret === value("JWT_SECRET"))
    throw new Error("Production requires a separate random FILE_SIGNING_SECRET of at least 32 characters.");
  const origins = value("WEB_ORIGIN").split(",").map((s) => s.trim());
  if (!origins.length || origins.some((origin) => { try { const url = new URL(origin); return url.protocol !== "https:" || url.origin !== origin; } catch { return true; } }))
    throw new Error("Production WEB_ORIGIN must list exact HTTPS origins.");
  if (value("RAZORPAY_KEY_ID").startsWith("rzp_live_") && (!value("RAZORPAY_WEBHOOK_SECRET") || value("RAZORPAY_WEBHOOK_SECRET").startsWith("replace-")))
    throw new Error("Live payments require RAZORPAY_WEBHOOK_SECRET for recovery after checkout closes.");
}
