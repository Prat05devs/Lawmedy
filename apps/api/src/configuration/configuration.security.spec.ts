import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { validate } from "class-validator";
import { ConfigurationController } from "./configuration.controller";
import { GeminiKeyDto, RazorpayCredentialsDto } from "./configuration.dto";
import { AuthGuard } from "../auth.guard";
import { RolesGuard } from "../roles.guard";

describe("Admin provider configuration boundaries", () => {
  it("protects every configuration route with authentication and database role guards", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ConfigurationController),
    ).toEqual([AuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata("lawmedy_roles", ConfigurationController),
    ).toEqual(["ADMIN"]);
  });
  it("rejects unknown fields, short secrets and unbounded key priority", async () => {
    const razorpay = Object.assign(new RazorpayCredentialsDto(), {
      keyId: "rzp_test_fixture",
      keySecret: "short",
      unknown: "not-allowed",
    });
    expect(
      (
        await validate(razorpay, {
          whitelist: true,
          forbidNonWhitelisted: true,
        })
      ).length,
    ).toBeGreaterThan(0);
    const gemini = Object.assign(new GeminiKeyDto(), {
      label: "Backup",
      apiKey: "fixture-key-long-enough",
      enabled: true,
      priority: -1,
    });
    expect(
      (await validate(gemini)).some((error) => error.property === "priority"),
    ).toBe(true);
  });
});
