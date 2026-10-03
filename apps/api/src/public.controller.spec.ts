import { PublicController } from "./public.controller";

describe("PublicController", () => {
  const db = { testimonial: { findMany: jest.fn().mockResolvedValue([]) } };
  const config = { get: (key: string, fallback?: unknown) => ({ LEGAL_NOTICE_PRICE_PAISE: "29900", RTI_PRICE_PAISE: "19900" } as Record<string, unknown>)[key] ?? fallback };
  const controller = new PublicController(db as never, config as never, { authorities: jest.fn() } as never, { run: jest.fn() } as never);

  it("reports prices from configuration, not constants", () => {
    expect(controller.pricing()).toEqual({ currency: "INR", legalNotice: 29900, rti: 19900 });
  });

  it("only ever returns published testimonials that have recorded consent", async () => {
    await controller.testimonials();
    expect(db.testimonial.findMany.mock.calls[0][0].where).toEqual({ published: true, consentGiven: true });
  });
});
