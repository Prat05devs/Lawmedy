import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type ReadyEmail = {
  to: string;
  fullName: string;
  referenceNumber: string;
  matterUrl: string;
};

@Injectable()
export class TransactionalEmailService {
  constructor(private readonly config: ConfigService) {}

  async sendReady(input: ReadyEmail) {
    const apiKey = this.config.get<string>("RESEND_API_KEY", "").trim();
    const from = this.config.get<string>("RESEND_FROM", "").trim();
    if (
      !apiKey ||
      apiKey.startsWith("replace-") ||
      !from ||
      from.startsWith("replace-")
    )
      return { status: "SKIPPED_CONFIGURATION" as const };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: `Your legal notice ${input.referenceNumber} is ready`,
          text: `Hello ${input.fullName},\n\nYour advocate-reviewed legal notice is ready. Sign in to Lawmedy to download it:\n${input.matterUrl}\n\nLawmedy`,
          html: `<p>Hello ${this.escape(input.fullName)},</p><p>Your advocate-reviewed legal notice <strong>${this.escape(input.referenceNumber)}</strong> is ready.</p><p><a href="${this.escape(input.matterUrl)}">Open your Lawmedy matter to download the PDF</a></p>`,
        }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
      };
      if (!response.ok || !body.id)
        throw new Error(`EMAIL_PROVIDER_${response.status}`);
      return { status: "SENT" as const, id: body.id };
    } finally {
      clearTimeout(timeout);
    }
  }

  private escape(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
