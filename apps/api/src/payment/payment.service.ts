import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma.service";
import { RazorpayService } from "./razorpay.service";
import { DocumentsService } from "../documents/documents.service";

@Injectable()
export class PaymentService {
  constructor(
    private readonly db: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly config: ConfigService,
    private readonly documents: DocumentsService,
  ) {}

  private price(matterType: "LEGAL_NOTICE" | "RTI") {
    const key = matterType === "RTI" ? "RTI_PRICE_PAISE" : "LEGAL_NOTICE_PRICE_PAISE";
    const amount = Number(this.config.get(key, 29900));
    if (!Number.isSafeInteger(amount) || amount < 100)
      throw new Error(`${key} must be an integer in paise.`);
    return amount;
  }

  async createOrder(userId: string, matterId: string) {
    const matter = await this.db.matter.findFirst({
      where: { id: matterId, userId },
      include: { user: true },
    });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.status === "PAID")
      throw new ConflictException("This matter is already paid.");
    if (matter.status !== "READY_FOR_PAYMENT")
      throw new ConflictException("Confirm your case information first.");
    const existing = await this.db.payment.findFirst({
      where: { matterId, status: "CREATED" },
      orderBy: { createdAt: "desc" },
    });
    const settings = this.razorpay.settings();
    if (!settings.configured)
      throw new ServiceUnavailableException(
        "Online payment is not configured yet. Your confirmed information is saved.",
      );
    if (existing)
      return this.checkout(existing, settings.keyId, matter.user, matter.type);

    const amount = this.price(matter.type);
    const currency = "INR";
    const order = await this.razorpay.createOrder({
      amount,
      currency,
      receipt: matter.referenceNumber,
      matterId,
    });
    const payment = await this.db.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          matterId,
          provider: "razorpay",
          providerOrderId: order.id,
          amount,
          currency,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "PAYMENT_ORDER_CREATED",
          entityType: "Payment",
          entityId: created.id,
        },
      });
      return created;
    });
    return this.checkout(payment, settings.keyId, matter.user, matter.type);
  }

  private checkout(
    payment: {
      providerOrderId: string;
      amount: number;
      currency: string;
    },
    keyId: string,
    user: { fullName: string; email: string },
    matterType: "LEGAL_NOTICE" | "RTI" = "LEGAL_NOTICE",
  ) {
    return {
      keyId,
      orderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      name: "Lawmedy",
      description: matterType === "RTI" ? "RTI drafting" : "Legal notice review",
      prefill: { name: user.fullName, email: user.email },
    };
  }

  async webhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const settings = this.razorpay.settings();
    if (
      !settings.webhookSecret ||
      settings.webhookSecret.startsWith("replace-")
    )
      throw new ServiceUnavailableException(
        "Payment webhook is not configured.",
      );
    if (!rawBody || !signature)
      throw new UnauthorizedException("Invalid webhook signature.");
    const expected = createHmac("sha256", settings.webhookSecret)
      .update(rawBody)
      .digest("hex");
    const supplied = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      supplied.length !== expectedBuffer.length ||
      !timingSafeEqual(supplied, expectedBuffer)
    )
      throw new UnauthorizedException("Invalid webhook signature.");

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid webhook payload.");
    }
    const event = this.paymentEvent(payload);
    if (!event) return { received: true };
    const payment = await this.db.payment.findUnique({
      where: { providerOrderId: event.orderId },
    });
    if (!payment) return { received: true };
    if (
      payment.amount !== event.amount ||
      payment.currency !== event.currency ||
      event.status !== "captured"
    )
      throw new BadRequestException("Payment details do not match the order.");
    const shouldGenerate = await this.db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: "CREATED" },
        data: {
          status: "PAID",
          providerPaymentId: event.paymentId,
          paidAt: new Date(),
        },
      });
      if (!updated.count) return false;
      await tx.matter.updateMany({
        where: { id: payment.matterId, status: "READY_FOR_PAYMENT" },
        data: { status: "PAID" },
      });
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          actorId: "razorpay",
          action: "PAYMENT_CONFIRMED",
          entityType: "Payment",
          entityId: payment.id,
        },
      });
      return true;
    });
    if (shouldGenerate)
      void this.documents.generateAfterPayment(payment.matterId).catch(() => {
        // Generation records its own safe failure state; the signed webhook is
        // still acknowledged so Razorpay does not retry a settled payment.
      });
    return { received: true };
  }

  private paymentEvent(payload: unknown) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return null;
    if (!("event" in payload) || payload.event !== "payment.captured")
      return null;
    const root = payload as Record<string, unknown>;
    const body = root.payload;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const paymentWrapper = (body as Record<string, unknown>).payment;
    if (
      !paymentWrapper ||
      typeof paymentWrapper !== "object" ||
      Array.isArray(paymentWrapper)
    )
      return null;
    const entity = (paymentWrapper as Record<string, unknown>).entity;
    if (!entity || typeof entity !== "object" || Array.isArray(entity))
      return null;
    const value = entity as Record<string, unknown>;
    if (
      typeof value.id !== "string" ||
      typeof value.order_id !== "string" ||
      typeof value.amount !== "number" ||
      typeof value.currency !== "string" ||
      typeof value.status !== "string"
    )
      return null;
    return {
      paymentId: value.id,
      orderId: value.order_id,
      amount: value.amount,
      currency: value.currency,
      status: value.status,
    };
  }
}
