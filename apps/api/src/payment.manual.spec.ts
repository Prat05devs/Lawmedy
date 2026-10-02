import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaymentService } from "./payment/payment.service";

describe("PaymentService manual payments", () => {
  const tx = {
    payment: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    matter: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const db = {
    matter: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const documents = { generateAfterPayment: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (key: string, fallback?: unknown) => ({ PAYMENT_MODE: "manual", LEGAL_NOTICE_PRICE_PAISE: 29900 } as Record<string, unknown>)[key] ?? fallback };
  const service = new PaymentService(db as never, {} as never, config as never, documents as never);

  beforeEach(() => jest.clearAllMocks());

  it("records the reference in upper case and moves the matter to verification", async () => {
    db.matter.findFirst.mockResolvedValue({ id: "m1", type: "LEGAL_NOTICE", status: "READY_FOR_PAYMENT" });
    tx.payment.create.mockResolvedValue({ id: "p1" });
    tx.matter.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.submitManual("u1", "m1", " pay_abc123 ")).resolves.toEqual({ status: "SUBMITTED" });
    expect(tx.payment.create.mock.calls[0][0].data).toMatchObject({ providerPaymentId: "PAY_ABC123", status: "SUBMITTED", amount: 29900 });
    expect(tx.notification.create).toHaveBeenCalled();
  });

  it("refuses a reference that was already used", async () => {
    db.matter.findFirst.mockResolvedValue({ id: "m1", type: "LEGAL_NOTICE", status: "READY_FOR_PAYMENT" });
    tx.payment.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
    await expect(service.submitManual("u1", "m1", "PAY_ABC123")).rejects.toBeInstanceOf(ConflictException);
  });

  it("will not take a payment before facts are confirmed or while one is pending", async () => {
    db.matter.findFirst.mockResolvedValue({ id: "m1", type: "LEGAL_NOTICE", status: "INTAKE_IN_PROGRESS" });
    await expect(service.submitManual("u1", "m1", "PAY_ABC123")).rejects.toBeInstanceOf(ConflictException);
    db.matter.findFirst.mockResolvedValue({ id: "m1", type: "LEGAL_NOTICE", status: "PAYMENT_VERIFICATION" });
    await expect(service.submitManual("u1", "m1", "PAY_ABC123")).rejects.toBeInstanceOf(ConflictException);
  });

  it("verifies once, notifies the user and starts the draft", async () => {
    tx.payment.findUnique.mockResolvedValue({ id: "p1", matterId: "m1" });
    tx.payment.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.matter.findUniqueOrThrow.mockResolvedValue({ userId: "u1" });
    await expect(service.verifyManual("admin", "p1")).resolves.toEqual({ status: "PAID" });
    expect(documents.generateAfterPayment).toHaveBeenCalledWith("m1");
    tx.payment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.verifyManual("admin", "p1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejecting returns the matter to payment and tells the user why", async () => {
    tx.payment.findUnique.mockResolvedValue({ id: "p1", matterId: "m1" });
    tx.payment.updateMany.mockResolvedValue({ count: 1 });
    tx.matter.findUniqueOrThrow.mockResolvedValue({ userId: "u1" });
    await service.rejectManual("admin", "p1", "Amount received was lower.");
    expect(tx.matter.updateMany).toHaveBeenCalledWith({ where: { id: "m1", status: "PAYMENT_VERIFICATION" }, data: { status: "READY_FOR_PAYMENT" } });
    expect(tx.notification.create.mock.calls[0][0].data.message).toContain("Amount received was lower.");
  });
});
