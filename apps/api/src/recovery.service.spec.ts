import { RecoveryService } from "./recovery.service";

describe("RecoveryService", () => {
  const build = (failedRuns: number) => {
    const db = {
      matter: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.status === "APPROVED" ? [] : [{ id: "matter-1" }])) },
      evidence: { findMany: jest.fn().mockResolvedValue([]) },
      aiRun: { count: jest.fn().mockResolvedValue(failedRuns), findFirst: jest.fn() },
    };
    const documents = { generateAfterPayment: jest.fn().mockResolvedValue(undefined) };
    const service = new RecoveryService(db as never, documents as never, {} as never, { generateAndDeliver: jest.fn() } as never);
    return { service, documents };
  };

  it("restarts a draft whose background job was lost", async () => {
    const { service, documents } = build(0);
    await expect(service.sweep()).resolves.toEqual({ recovered: 1, skipped: false });
    expect(documents.generateAfterPayment).toHaveBeenCalledWith("matter-1");
  });

  it("stops retrying a matter whose AI runs keep failing", async () => {
    const { service, documents } = build(3);
    await expect(service.sweep()).resolves.toEqual({ recovered: 0, skipped: false });
    expect(documents.generateAfterPayment).not.toHaveBeenCalled();
  });

  it("lets an admin force a retry past the failure cap", async () => {
    const { service, documents } = build(5);
    await expect(service.sweep(true)).resolves.toEqual({ recovered: 1, skipped: false });
    expect(documents.generateAfterPayment).toHaveBeenCalledTimes(1);
  });
});

describe("RecoveryService resilience", () => {
  it("logs a database failure instead of throwing, so a timer can never crash the API", async () => {
    const db = { matter: { findMany: jest.fn().mockRejectedValue(new Error("Can't reach database server")) }, evidence: { findMany: jest.fn() }, aiRun: { count: jest.fn(), findFirst: jest.fn() } };
    const service = new RecoveryService(db as never, {} as never, {} as never, {} as never);
    await expect(service.sweep()).resolves.toEqual({ recovered: 0, skipped: false });
    await expect(service.sweep()).resolves.toEqual({ recovered: 0, skipped: false });
  });
});
