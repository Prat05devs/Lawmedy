import { ConflictException } from "@nestjs/common";
import { AdvocateService } from "./advocate.service";

describe("AdvocateService RTI review", () => {
  const draft = {
    status: "READY",
    applicant: { name: "Asha", address: "1 Road", phone: null },
    publicAuthority: { name: "Railway Board", department: "Railways", address: "New Delhi" },
    subject: "Old subject",
    period: null,
    informationRequests: [
      { text: "First", caseFactIds: ["fact-1"] },
      { text: "Second", caseFactIds: ["fact-2"] },
    ],
  };
  const tx = {
    $queryRaw: jest.fn(),
    legalDocument: { findFirst: jest.fn(), update: jest.fn() },
    documentVersion: { create: jest.fn() },
    matter: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    matterAssignment: { update: jest.fn() },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const db = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)), matterAssignment: { findFirst: jest.fn(), update: jest.fn() }, auditLog: { create: jest.fn() } };
  const finals = { generateAndDeliver: jest.fn().mockResolvedValue(undefined) };
  const service = new AdvocateService(db as never, {} as never, finals as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ status: "UNDER_ADVOCATE_REVIEW", userId: "u1", assignmentId: "a1" }]);
    tx.documentVersion.create.mockResolvedValue({ id: "v3", versionNumber: 3 });
    db.matterAssignment.findFirst.mockResolvedValue({ id: "a1", matter: {} });
    db.$transaction.mockImplementation((arg: unknown) => (typeof arg === "function" ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as unknown[])));
  });

  it("saves an edited RTI as a new advocate version and keeps fact references", async () => {
    tx.legalDocument.findFirst.mockResolvedValue({ id: "d1", currentVersion: 2, versions: [{ content: draft }] });
    await service.editRtiDraft("adv", "m1", { expectedVersion: 2, subject: "New subject", informationRequests: [{ text: "First, reworded" }, { text: "Second" }, { text: "Added by advocate" }] });
    const saved = tx.documentVersion.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({ versionNumber: 3, createdByType: "ADVOCATE" });
    expect(saved.content.subject).toBe("New subject");
    expect(saved.content.applicant).toEqual(draft.applicant);
    expect(saved.content.publicAuthority).toEqual(draft.publicAuthority);
    expect(saved.content.informationRequests.map((r: { caseFactIds: string[] }) => r.caseFactIds)).toEqual([["fact-1"], ["fact-2"], ["fact-1"]]);
  });

  it("refuses an RTI edit made against a stale version", async () => {
    tx.legalDocument.findFirst.mockResolvedValue({ id: "d1", currentVersion: 3, versions: [{ content: draft }] });
    await expect(service.editRtiDraft("adv", "m1", { expectedVersion: 2, subject: "x", informationRequests: [{ text: "y" }] })).rejects.toBeInstanceOf(ConflictException);
  });

  it("approves an RTI application, notifies the user with RTI wording and builds the PDF", async () => {
    tx.matter.findUniqueOrThrow.mockResolvedValue({ type: "RTI" });
    tx.legalDocument.findFirst.mockResolvedValue({ id: "d1", currentVersion: 2 });
    await service.approve("adv", "m1", true);
    expect(tx.legalDocument.findFirst.mock.calls[0][0].where.documentType).toBe("RTI");
    expect(tx.notification.create.mock.calls[0][0].data.title).toBe("Your RTI application was approved");
    expect(finals.generateAndDeliver).toHaveBeenCalledWith("m1");
  });
});
