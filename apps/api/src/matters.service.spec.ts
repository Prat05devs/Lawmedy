import { ConflictException, NotFoundException } from "@nestjs/common";
import { MattersService } from "./matters.service";
import { PrismaService } from "./prisma.service";
describe("Matter ownership and transitions", () => {
  const tx = {
    matter: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    matterStatement: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const db = {
    ...tx,
    $transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  };
  const service = new MattersService(db as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it("hides another user’s matter", async () => {
    tx.matter.findFirst.mockResolvedValue(null);
    await expect(service.get("other-user", "matter")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.matter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "matter", userId: "other-user" },
      }),
    );
  });
  it("does not allow a statement on an unowned matter", async () => {
    tx.matter.findFirst.mockResolvedValue(null);
    await expect(
      service.saveStatement("other", "matter", "text"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.matterStatement.create).not.toHaveBeenCalled();
  });
  it("saves a statement, advances status, and audits together", async () => {
    tx.matter.findFirst.mockResolvedValue({ status: "DRAFT" });
    tx.matter.updateMany.mockResolvedValue({ count: 1 });
    tx.matterStatement.create.mockResolvedValue({ id: "statement" });
    await expect(
      service.saveStatement("owner", "matter", "My facts"),
    ).resolves.toEqual({ id: "statement" });
    expect(tx.matter.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "INTAKE_IN_PROGRESS" } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "owner",
        action: "STATEMENT_SAVED",
        entityType: "Matter",
        entityId: "matter",
      },
    });
  });
  it("does not reopen completed matters", async () => {
    tx.matter.findFirst.mockResolvedValue({ status: "COMPLETED" });
    await expect(
      service.saveStatement("owner", "matter", "text"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.matterStatement.create).not.toHaveBeenCalled();
  });
});
