import { AdvocateInterestService, normalizeIndianMobile } from "./advocate-interest.service";

describe("normalizeIndianMobile", () => {
  it.each([["98765 43210"], ["+91 98765-43210"], ["919876543210"], ["09876543210"]])("accepts %s", (input) => {
    expect(normalizeIndianMobile(input)).toBe("+919876543210");
  });
  it.each([["12345"], ["5876543210"], ["98765432101"], ["abcdefghij"]])("rejects %s", (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

describe("AdvocateInterestService", () => {
  const make = () => {
    const db = {
      advocateInterest: { upsert: jest.fn().mockResolvedValue({ id: "a1" }), update: jest.fn().mockResolvedValue({ id: "a1" }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    return { db, service: new AdvocateInterestService(db as never) };
  };

  it("stores a registration keyed by lower-case email, with the phone normalised, and logs it", async () => {
    const { db, service } = make();
    await expect(service.register({ fullName: " Asha Rao ", email: "Asha@Example.com ", phone: "98765 43210", practicePlace: " Saket Courts, Delhi " })).resolves.toEqual({ registered: true });
    expect(db.advocateInterest.upsert).toHaveBeenCalledWith({
      where: { email: "asha@example.com" },
      create: { email: "asha@example.com", fullName: "Asha Rao", phone: "+919876543210", practicePlace: "Saket Courts, Delhi", source: "app" },
      update: { fullName: "Asha Rao", phone: "+919876543210", practicePlace: "Saket Courts, Delhi", source: "app" },
    });
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "ADVOCATE_INTEREST_REGISTERED", entityId: "a1" });
  });

  it("allows registering without a phone number", async () => {
    const { db, service } = make();
    await service.register({ fullName: "Asha Rao", email: "asha@example.com", phone: "", practicePlace: "Pune" });
    expect(db.advocateInterest.upsert.mock.calls[0][0].create.phone).toBeNull();
  });

  it("rejects a phone number that is not an Indian mobile", async () => {
    const { db, service } = make();
    await expect(service.register({ fullName: "Asha Rao", email: "asha@example.com", phone: "12345", practicePlace: "Pune" })).rejects.toThrow("10-digit");
    expect(db.advocateInterest.upsert).not.toHaveBeenCalled();
  });

  it("records when the team made contact, and logs the admin who did", async () => {
    const { db, service } = make();
    await service.setStatus("admin-1", "a1", "CONTACTED");
    expect(db.advocateInterest.update.mock.calls[0][0].data.contactedAt).toBeInstanceOf(Date);
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorType: "ADMIN", actorId: "admin-1", action: "ADVOCATE_INTEREST_CONTACTED" });
  });
});
