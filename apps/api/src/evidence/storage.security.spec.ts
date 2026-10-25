import { SupabasePrivateStorage, LocalPrivateStorage } from "./storage.service";
describe("private file storage", () => {
  const config = { get: (key: string, fallback: unknown) => ({ SUPABASE_URL: "https://storage.example.test", SUPABASE_SERVICE_KEY: "server-only", SUPABASE_BUCKET: "private" } as Record<string, unknown>)[key] ?? fallback };
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  it("rejects existing public buckets before writing or reading any document", async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response(JSON.stringify({ id: "private", public: true })));
    const storage = new SupabasePrivateStorage(config as never);
    await expect(storage.put("a/b", Buffer.from("private"))).rejects.toThrow("STORAGE_BUCKET_MUST_BE_PRIVATE");
    await expect(storage.read("a/b")).rejects.toThrow("STORAGE_BUCKET_MUST_BE_PRIVATE");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
  it("fails closed on an ambiguous bucket API error", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response("{}", { status: 400 }));
    await expect(new SupabasePrivateStorage(config as never).put("a/b", Buffer.from("private"))).rejects.toThrow();
  });
  it("rejects traversal and malformed local storage keys", async () => {
    const storage = new LocalPrivateStorage({ get: () => "/private/tmp/lawmedy-storage-test" } as never);
    await expect(storage.put("../../etc/passwd", Buffer.from("x"))).rejects.toThrow("INVALID_STORAGE_KEY");
    await expect(storage.put("a/../../b", Buffer.from("x"))).rejects.toThrow("INVALID_STORAGE_KEY");
  });
});
