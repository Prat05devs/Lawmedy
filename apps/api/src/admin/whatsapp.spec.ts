import { ConflictException } from "@nestjs/common";
import { AdminService } from "./admin.service";

describe("AdminService WhatsApp delivery", () => {
  const setup = (matter: unknown) => {
    const tx = {
      matter: { findUnique: jest.fn().mockResolvedValue(matter), update: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const db = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    return { tx, service: new AdminService(db as never, {} as never, {} as never) };
  };

  it("records that the final PDF was sent on WhatsApp", async () => {
    const { tx, service } = setup({ id: "m1", whatsappNumber: "+919876543210", finalDocument: { id: "f1" } });
    await service.markWhatsappSent("admin", "m1");
    expect(tx.matter.update.mock.calls[0][0].data.whatsappSentAt).toBeInstanceOf(Date);
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorType: "ADMIN", actorId: "admin", action: "FINAL_PDF_SENT_ON_WHATSAPP" });
  });

  it("refuses before the final PDF exists", async () => {
    const { tx, service } = setup({ id: "m1", whatsappNumber: "+919876543210", finalDocument: null });
    await expect(service.markWhatsappSent("admin", "m1")).rejects.toBeInstanceOf(ConflictException);
    expect(tx.matter.update).not.toHaveBeenCalled();
  });

  it("refuses when there is no WhatsApp number", async () => {
    const { service } = setup({ id: "m1", whatsappNumber: null, finalDocument: { id: "f1" } });
    await expect(service.markWhatsappSent("admin", "m1")).rejects.toBeInstanceOf(ConflictException);
  });
});
