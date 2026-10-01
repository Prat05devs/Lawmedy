import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RazorpayService {
  constructor(private readonly config: ConfigService) {}

  settings() {
    const keyId = this.config.get<string>("RAZORPAY_KEY_ID", "").trim();
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET", "").trim();
    const webhookSecret = this.config
      .get<string>("RAZORPAY_WEBHOOK_SECRET", "")
      .trim();
    const configured =
      !!keyId &&
      !!keySecret &&
      !!webhookSecret &&
      !keyId.startsWith("replace-") &&
      !keySecret.startsWith("replace-") &&
      !webhookSecret.startsWith("replace-");
    return { keyId, keySecret, webhookSecret, configured };
  }

  async createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    matterId: string;
  }) {
    const settings = this.settings();
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
