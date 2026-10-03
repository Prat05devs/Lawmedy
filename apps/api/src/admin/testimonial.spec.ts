import { ConflictException } from "@nestjs/common";
import { AdminService } from "./admin.service";

describe("AdminService testimonials", () => {
  const db = { testimonial: { create: jest.fn().mockResolvedValue({ id: "t1" }) }, auditLog: { create: jest.fn() } };
  const service = new AdminService(db as never, {} as never, {} as never);
  const base = { name: "Asha", quote: "They explained every step and the notice reached the right person.", consentGiven: true, published: true };

  it("will not publish someone's words without recorded permission", async () => {
    await expect(service.saveTestimonial("admin", null, { ...base, consentGiven: false })).rejects.toBeInstanceOf(ConflictException);
    expect(db.testimonial.create).not.toHaveBeenCalled();
  });

  it("saves a consented testimonial and records the action", async () => {
    await service.saveTestimonial("admin", null, base);
    expect(db.testimonial.create).toHaveBeenCalled();
    expect(db.auditLog.create.mock.calls[0][0].data.action).toBe("TESTIMONIAL_CREATED");
  });

  it("allows an unpublished draft without consent yet", async () => {
    await expect(service.saveTestimonial("admin", null, { ...base, consentGiven: false, published: false })).resolves.toBeDefined();
  });
});
