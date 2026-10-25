import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

describe("session enforcement", () => {
  it.each([null, { active: false, tokenVersion: 0 }, { active: true, tokenVersion: 1 }])("rejects deleted, disabled or revoked sessions: %j", async (user) => {
    const guard = new AuthGuard({ verifyAsync: async () => ({ sub: "user", ver: 0 }) } as never,
      { user: { findUnique: async () => user } } as never);
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: "Bearer signed" } }) }) } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it("rejects legacy tokens without a revocation version", async () => {
    const findUnique = jest.fn();
    const guard = new AuthGuard({ verifyAsync: async () => ({ sub: "user" }) } as never, { user: { findUnique } } as never);
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: "Bearer old" } }) }) } as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });
  it("does not issue a Google session for a disabled account", async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ sub: "fixture-google-subject", iss: "https://accounts.google.com", aud: "configured-client", email: "disabled@example.test", email_verified: true, exp: String(Math.floor(Date.now() / 1000) + 60) })));
    const signAsync = jest.fn();
    try {
      const service = new AuthService({ user: { findUnique: async () => ({ active: false }) } } as never, { signAsync } as never,
        { get: () => "configured-client" } as never);
      await expect(service.google("provider-token")).rejects.toBeInstanceOf(UnauthorizedException);
      expect(signAsync).not.toHaveBeenCalled();
    } finally { global.fetch = original; }
  });
});
