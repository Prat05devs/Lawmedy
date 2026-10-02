import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
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

  // "manual": the user pays on a hosted payment link, then our team verifies the
  // reference by hand. "razorpay": automatic checkout (needs API keys).
  manualSettings() {
    const mode = this.config.get<string>("PAYMENT_MODE", "manual") === "razorpay" ? "razorpay" : "manual";
    const link = this.config.get<string>("PAYMENT_LINK_URL", "https://razorpay.me/@aawasyojana").trim();
    return { mode, link } as const;
  }

  async submitManual(userId: string, matterId: string, reference: string) {
    if (this.manualSettings().mode !== "manual")
      throw new ConflictException("Manual payment is not enabled.");
    const matter = await this.db.matter.findFirst({ where: { id: matterId, userId } });
    if (!matter) throw new NotFoundException("Matter not found.");
    if (matter.status === "PAYMENT_VERIFICATION")
      throw new ConflictException("Your payment is already being verified.");
    if (matter.status !== "READY_FOR_PAYMENT")
      throw new ConflictException("Confirm your case information first.");
    const amount = this.price(matter.type);
    const ref = reference.trim().replace(/\s+/g, " ").toUpperCase();
    try {
      return await this.db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            matterId,
            provider: "payment_link",
            providerOrderId: `link-${randomUUID()}`,
            providerPaymentId: ref,
            amount,
            currency: "INR",
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        });
        const moved = await tx.matter.updateMany({
          where: { id: matterId, status: "READY_FOR_PAYMENT" },
          data: { status: "PAYMENT_VERIFICATION" },
        });
        if (!moved.count) throw new ConflictException("This matter can no longer accept a payment.");
        await tx.notification.create({
          data: {
            userId,
            matterId,
            title: "Payment details received",
            message: "We have your payment reference. Our team is verifying it and your dashboard will update as soon as it is confirmed.",
          },
        });
        await tx.auditLog.create({
          data: { actorId: userId, action: "PAYMENT_SUBMITTED", entityType: "Payment", entityId: payment.id },
        });
        return { status: "SUBMITTED" as const };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictException("This payment reference has already been used. Please check it and try again.");
      throw error;
    }
  }

  listSubmitted() {
    return this.db.payment.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        matter: {
          select: {
            id: true,
            referenceNumber: true,
            type: true,
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
  }

  async verifyManual(adminId: string, paymentId: string) {
    const result = await this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Payment not found.");
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: "SUBMITTED" },
        data: { status: "PAID", paidAt: new Date(), verifiedById: adminId, reviewNote: null },
      });
      if (!updated.count) throw new ConflictException("This payment is not waiting for verification.");
      await tx.matter.updateMany({
        where: { id: payment.matterId, status: "PAYMENT_VERIFICATION" },
        data: { status: "PAID" },
      });
      const matter = await tx.matter.findUniqueOrThrow({ where: { id: payment.matterId }, select: { userId: true } });
      await tx.notification.create({
        data: {
          userId: matter.userId,
          matterId: payment.matterId,
          title: "Payment verified",
          message: "Your payment is verified and your document is now in progress. It usually takes 24 hours or less. You can follow the progress on your dashboard.",
        },
      });
      await tx.auditLog.create({
        data: { actorType: "ADMIN", actorId: adminId, action: "PAYMENT_VERIFIED", entityType: "Payment", entityId: paymentId },
      });
      return payment.matterId;
    });
    void this.documents.generateAfterPayment(result).catch(() => {
      // Generation records its own safe failure state.
    });
    return { status: "PAID" as const };
  }

  async rejectManual(adminId: string, paymentId: string, note: string) {
    await this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Payment not found.");
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: "SUBMITTED" },
        data: { status: "REJECTED", verifiedById: adminId, reviewNote: note },
      });
      if (!updated.count) throw new ConflictException("This payment is not waiting for verification.");
      await tx.matter.updateMany({
        where: { id: payment.matterId, status: "PAYMENT_VERIFICATION" },
        data: { status: "READY_FOR_PAYMENT" },
      });
      const matter = await tx.matter.findUniqueOrThrow({ where: { id: payment.matterId }, select: { userId: true } });
      await tx.notification.create({
        data: {
          userId: matter.userId,
          matterId: payment.matterId,
          title: "We could not verify your payment",
          message: `${note} Please check the amount and reference, then submit your payment again.`,
        },
      });
      await tx.auditLog.create({
        data: { actorType: "ADMIN", actorId: adminId, action: "PAYMENT_REJECTED", entityType: "Payment", entityId: paymentId },
      });
    });
    return { status: "REJECTED" as const };
  }

  async createOrder(userId: string, matterId: string) {
    if (this.manualSettings().mode === "manual")
      throw new ConflictException("Online checkout is not enabled. Use the payment link and submit your reference.");
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
    await this.settle(payment.id, payment.matterId, event.paymentId, "razorpay");
    return { received: true };
  }


  // Shared by the signed webhook and the signature-verified checkout callback.
  private async settle(paymentRowId: string, matterId: string, providerPaymentId: string, actor: string) {
    const shouldGenerate = await this.db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: paymentRowId, status: "CREATED" },
        data: { status: "PAID", providerPaymentId, paidAt: new Date() },
      });
      if (!updated.count) return false;
      await tx.matter.updateMany({ where: { id: matterId, status: "READY_FOR_PAYMENT" }, data: { status: "PAID" } });
      await tx.auditLog.create({
        data: { actorType: "SYSTEM", actorId: actor, action: "PAYMENT_CONFIRMED", entityType: "Payment", entityId: paymentRowId },
      });
      return true;
    });
    if (shouldGenerate)
      void this.documents.generateAfterPayment(matterId).catch(() => {
        // Generation records its own safe failure state.
      });
  }

  // Checkout callback: Razorpay signs "order_id|payment_id" with the key secret.
  async verifyCheckout(userId: string, matterId: string, input: { orderId: string; paymentId: string; signature: string }) {
    const settings = this.razorpay.settings();
    if (!settings.configured) throw new ServiceUnavailableException("Online payment is not configured.");
    const payment = await this.db.payment.findFirst({
      where: { matterId, providerOrderId: input.orderId, matter: { userId } },
    });
    if (!payment) throw new NotFoundException("Payment not found.");
    const expected = createHmac("sha256", settings.keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
    const supplied = Buffer.from(input.signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer))
      throw new UnauthorizedException("Payment signature is invalid.");
    await this.settle(payment.id, matterId, input.paymentId, "razorpay-checkout");
    return { status: "PAID" };
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
