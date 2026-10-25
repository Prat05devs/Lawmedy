import { PayloadTooLargeException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { unzipSync } from "fflate";

describe("admin ZIP resource budget", () => {
  const setup = (sizeBytes: number, contents = Buffer.from("evidence")) => {
    const db = { matter: { findUnique: async () => ({ referenceNumber: "MAT-test", evidence: [{ storageKey: "key", originalFilename: "proof.pdf", sizeBytes }] }) } };
    const read = jest.fn().mockResolvedValue(contents);
    return { read, service: new AdminService(db as never, { read } as never, {} as never) };
  };
  it("rejects oversized archives before allocating file buffers", async () => {
    const { read, service } = setup(26 * 1024 * 1024);
    await expect(service.evidenceZip("matter")).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(read).not.toHaveBeenCalled();
  });
  it("checks actual bytes as well as database metadata", async () => {
    const { service } = setup(1, Buffer.alloc(26 * 1024 * 1024));
    await expect(service.evidenceZip("matter")).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
  it("retains valid archives within the budget", async () => {
    const { service } = setup(8);
    const zip = await service.evidenceZip("matter");
    expect(Buffer.from(unzipSync(zip.contents)["01-proof.pdf"]).toString()).toBe("evidence");
  });
});
