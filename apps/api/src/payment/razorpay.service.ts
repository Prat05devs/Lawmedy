import { ProviderConfigurationService, type RuntimeRazorpay } from "../configuration/configuration.service";
import { Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { paymentSettings } from "./settings";

@Injectable()
export class RazorpayService {
  constructor(private readonly config: ConfigService, @Optional() private readonly providers?: ProviderConfigurationService) {}

  settings(credentialId?: string): RuntimeRazorpay {
    return this.providers ? this.providers.razorpay(credentialId) : paymentSettings(this.config);
  }

  versions() { return this.providers?.razorpayVersions() ?? [this.settings()]; }

  async fetchPayment(paymentId: string, pinned?: RuntimeRazorpay) {
    const settings = pinned ?? this.settings();
    if (!settings.configured)
      throw new ServiceUnavailableException("Online payment is not configured.");
    try {
      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${settings.keyId}:${settings.keySecret}`).toString("base64")}` },
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      if (!response.ok || !body || typeof body !== "object" ||
          body.id !== paymentId || typeof body.order_id !== "string" ||
          !Number.isSafeInteger(body.amount) || typeof body.currency !== "string" ||
          typeof body.status !== "string") throw new Error("Invalid provider response");
      return { id: body.id as string, orderId: body.order_id as string, amount: body.amount as number,
        currency: body.currency as string, status: body.status as string };
    } catch {
      throw new ServiceUnavailableException("Payment confirmation is temporarily unavailable. Check this matter again shortly; do not pay again.");
    }
  }

  async createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    matterId: string;
  }, pinned?: RuntimeRazorpay) {
    const settings = pinned ?? this.settings();
    if (!settings.configured)
      throw new ServiceUnavailableException(
        "Online payment is not configured yet. Your confirmed information is saved.",
      );
    let response: Response;
    try {
      response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${settings.keyId}:${settings.keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          receipt: input.receipt.slice(0, 40),
          notes: { matterId: input.matterId },
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "We could not connect to the payment provider. Please try again.",
      );
    }
    const body = (await response.json().catch(() => null)) as unknown;
    if (
      !response.ok ||
      !body ||
      typeof body !== "object" ||
      !("id" in body) ||
      typeof body.id !== "string" ||
      !body.id.startsWith("order_")
    )
      throw new ServiceUnavailableException(
        "The payment provider could not create an order. Please try again.",
      );
    return { id: body.id };
  }
}
