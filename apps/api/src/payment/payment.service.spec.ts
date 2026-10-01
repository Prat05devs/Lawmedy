import { createHmac } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { PaymentService } from "./payment.service";

describe("PaymentService webhook", () => {
  const secret = "test-webhook-secret-that-is-long-enough";
  const payload = Buffer.from(
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test",
            order_id: "order_test",
            amount: 29900,
            currency: "INR",
            status: "captured",
          },
        },
      },
    }),
  );

  function setup(updateCount = 1) {
    const tx = {
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
      },
      matter: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const db = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: "payment-row",
          matterId: "matter-row",
          amount: 29900,
          currency: "INR",
        }),
      },
      $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const razorpay = {
      settings: () => ({ webhookSecret: secret }),
    };
    const config = { get: jest.fn() };
    const documents = { generateAfterPayment: jest.fn().mockResolvedValue(undefined) };
    const service = new PaymentService(
      db as never,
      razorpay as never,
      config as never,
      documents as never,
    );
    return { service, db, tx, documents };
  }

  it("rejects an invalid webhook signature before database changes", async () => {
    const { service, db } = setup();
    await expect(service.webhook(payload, "00")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(db.payment.findUnique).not.toHaveBeenCalled();
  });

  it("marks both payment and matter paid after a valid captured event", async () => {
    const { service, tx, documents } = setup();
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    await expect(service.webhook(payload, signature)).resolves.toEqual({
      received: true,
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          providerPaymentId: "pay_test",
        }),
      }),
    );
    expect(tx.matter.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PAID" } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(documents.generateAfterPayment).toHaveBeenCalledWith("matter-row");
  });

  it("handles a duplicate valid webhook idempotently", async () => {
    const { service, tx, documents } = setup(0);
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    await service.webhook(payload, signature);
    expect(tx.matter.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(documents.generateAfterPayment).not.toHaveBeenCalled();
  });
});
