import { ConflictException, NotFoundException } from "@nestjs/common";
import { AccountService } from "./account.service";

describe("AccountService.deleteAccount", () => {
  const tx = new Proxy({} as Record<string, Record<string, jest.Mock>>, {
    get: (target, model: string) => (target[model] ??= new Proxy({} as Record<string, jest.Mock>, { get: (m, op: string) => (m[op] ??= jest.fn().mockResolvedValue({})) })),
  });
  const db = {
    user: { findUnique: jest.fn() },
    matter: { findMany: jest.fn().mockResolvedValue([{ id: "m1" }]) },
    evidence: { findMany: jest.fn().mockResolvedValue([{ id: "e1", storageKey: "a/b" }]) },
    finalDocument: { findMany: jest.fn().mockResolvedValue([{ storageKey: "c/d" }]) },
    legalDocument: { findMany: jest.fn().mockResolvedValue([]) },
    matterQuestion: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
  };
  const storage = { remove: jest.fn().mockResolvedValue(undefined) };
  const service = new AccountService(db as never, storage as never);

  beforeEach(() => jest.clearAllMocks());

  it("erases content, anonymises the user and removes stored files", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1", role: "USER", active: true });
    await expect(service.deleteAccount("u1")).resolves.toEqual({ deleted: true });
    const update = (tx.user.update as jest.Mock).mock.calls[0][0];
    expect(update.data).toMatchObject({ active: false, fullName: "Deleted user" });
    expect(update.data.email).toMatch(/^deleted-u1@/);
    expect(tx.payment.deleteMany).not.toHaveBeenCalled(); // payment records are retained
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });

  it("refuses staff accounts and unknown or already deleted accounts", async () => {
    db.user.findUnique.mockResolvedValue({ id: "a1", role: "ADMIN", active: true });
    await expect(service.deleteAccount("a1")).rejects.toBeInstanceOf(ConflictException);
    db.user.findUnique.mockResolvedValue({ id: "u1", role: "USER", active: false });
    await expect(service.deleteAccount("u1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
