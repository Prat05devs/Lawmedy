import { AppThrottlerGuard } from "./throttler.guard";

describe("AppThrottlerGuard tracker", () => {
  const make = (verify: jest.Mock) => {
    const guard = Object.create(AppThrottlerGuard.prototype) as Record<string, unknown>;
    guard.jwt = { verifyAsync: verify };
    return guard as unknown as { getTracker(req: Record<string, unknown>): Promise<string> };
  };

  it("limits login and signup per email, not per shared IP", async () => {
    const guard = make(jest.fn());
    await expect(guard.getTracker({ body: { email: " Ana@Example.com " }, headers: {}, ip: "10.0.0.1" })).resolves.toBe("email:ana@example.com");
  });

  it("buckets signed-in callers by verified user id", async () => {
    const guard = make(jest.fn().mockResolvedValue({ sub: "user-1" }));
    await expect(guard.getTracker({ body: {}, headers: { authorization: "Bearer good" }, ip: "10.0.0.1" })).resolves.toBe("user:user-1");
  });

  it("does not let a forged token pick its own bucket", async () => {
    const guard = make(jest.fn().mockRejectedValue(new Error("bad signature")));
    await expect(guard.getTracker({ body: {}, headers: { authorization: "Bearer forged" }, ip: "203.0.113.9" })).resolves.toBe("ip:203.0.113.9");
  });
});
