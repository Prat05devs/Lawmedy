import { LocalPrivateStorage } from "./storage.service";
describe("private file storage", () => {
  it("rejects traversal and malformed local storage keys", async () => {
    const storage = new LocalPrivateStorage({ get: () => "/private/tmp/lawmedy-storage-test" } as never);
    await expect(storage.put("../../etc/passwd", Buffer.from("x"))).rejects.toThrow("INVALID_STORAGE_KEY");
    await expect(storage.put("a/../../b", Buffer.from("x"))).rejects.toThrow("INVALID_STORAGE_KEY");
  });
});
