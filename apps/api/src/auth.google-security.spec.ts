import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";

describe("Google identity binding", () => {
  const token = {
    sub: "verified-google-subject",
    iss: "https://accounts.google.com",
    aud: "fixture-client",
    email: "owner@example.test",
    email_verified: true,
    exp: String(Math.floor(Date.now() / 1000) + 3600),
  };
  const original = global.fetch;
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(token)));
  });
  afterEach(() => {
    global.fetch = original;
  });
  it("does not merge a verified Google login into a pre-registered password account", async () => {
    const db = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "attacker-precreated" }),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const jwt = { signAsync: jest.fn() };
    const service = new AuthService(
      db as never,
      jwt as never,
      new ConfigService({ GOOGLE_CLIENT_IDS: "fixture-client" }),
    );
    await expect(service.google("fixture-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(db.user.findUnique.mock.calls[0][0]).toEqual({
      where: { googleSubject: token.sub },
    });
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("accepts an active account bound to the exact verified subject", async () => {
    const db = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: "owner",
            active: true,
            tokenVersion: 3,
            role: "USER",
            email: token.email,
          }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue("fixture-session") };
    const service = new AuthService(
      db as never,
      jwt as never,
      new ConfigService({ GOOGLE_CLIENT_IDS: "fixture-client" }),
    );
    await expect(service.google("fixture-token")).resolves.toMatchObject({
      accessToken: "fixture-session",
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: "owner", ver: 3 });
  });
  it("rejects token information without a stable subject", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ...token, sub: undefined })),
      );
    const db = { user: { findUnique: jest.fn() } };
    const service = new AuthService(
      db as never,
      {} as never,
      new ConfigService({ GOOGLE_CLIENT_IDS: "fixture-client" }),
    );
    await expect(service.google("fixture-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});
