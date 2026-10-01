import { BadRequestException } from "@nestjs/common";
import { AdvocateService } from "./advocate.service";

describe("AdvocateService assignment and approval", () => {
  const tx = {
    $queryRaw: jest.fn(),
    user: { findFirst: jest.fn() },
    matterAssignment: { upsert: jest.fn() },
    matter: { update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const db = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new AdvocateService(db as never, {} as never, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it("assigns the oldest advocate and advances the matter", async () => {
    tx.$queryRaw.mockResolvedValue([{ status: "DRAFT_GENERATED" }]);
    tx.user.findFirst.mockResolvedValue({ id: "advocate-1" });
    tx.matterAssignment.upsert.mockResolvedValue({ id: "assignment-1" });

    await expect(service.assign("matter-1")).resolves.toBe(true);
    expect(tx.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: "ADVOCATE" } }),
    );
    expect(tx.matter.update).toHaveBeenCalledWith({
      where: { id: "matter-1" },
      data: { status: "UNDER_ADVOCATE_REVIEW" },
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it("keeps a generated draft unassigned when no advocate is seeded", async () => {
    tx.$queryRaw.mockResolvedValue([{ status: "DRAFT_GENERATED" }]);
    tx.user.findFirst.mockResolvedValue(null);

    await expect(service.assign("matter-1")).resolves.toBe(false);
    expect(tx.matterAssignment.upsert).not.toHaveBeenCalled();
    expect(tx.matter.update).not.toHaveBeenCalled();
  });

  it("requires an explicit approval confirmation", async () => {
    await expect(service.approve("advocate-1", "matter-1", false)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
