import { ConfigService } from "@nestjs/config";

// Valid API keys automatically replace the legacy payment-link workflow.
// Keep explicitly requested Razorpay mode unavailable until both keys exist.
export function paymentSettings(config: ConfigService) {
  const value = (name: string) => config.get<string>(name, "").trim();
  const keyId = value("RAZORPAY_KEY_ID");
  const keySecret = value("RAZORPAY_KEY_SECRET");
  const webhookSecret = value("RAZORPAY_WEBHOOK_SECRET");
  const configured = /^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) &&
    !!keySecret && !keySecret.startsWith("replace-");
  const mode = configured || value("PAYMENT_MODE") === "razorpay" ? "razorpay" : "manual";
  const link = value("PAYMENT_LINK_URL");
  return { keyId, keySecret, webhookSecret, configured, mode, link } as const;
}
