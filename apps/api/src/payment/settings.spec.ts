import { paymentSettings } from "./settings";

function settings(values: Record<string, string>) {
  return paymentSettings({ get: (key: string, fallback: string) => values[key] ?? fallback } as never);
}
describe("automatic payment mode", () => {
  it("valid keys bypass an old manual setting without needing a webhook secret", () => {
    expect(settings({ PAYMENT_MODE: "manual", RAZORPAY_KEY_ID: "rzp_live_12345", RAZORPAY_KEY_SECRET: "private-secret" }))
      .toMatchObject({ mode: "razorpay", configured: true });
  });
  it("does not treat placeholder or partial credentials as configured", () => {
    expect(settings({ RAZORPAY_KEY_ID: "replace-with-key", RAZORPAY_KEY_SECRET: "replace-with-secret" }).configured).toBe(false);
    expect(settings({ PAYMENT_MODE: "razorpay", RAZORPAY_KEY_ID: "rzp_test_12345" }))
      .toMatchObject({ mode: "razorpay", configured: false });
  });
  it("preserves a configured manual fallback before keys are added", () => {
    expect(settings({ PAYMENT_LINK_URL: "https://razorpay.me/@example" }))
      .toMatchObject({ mode: "manual", link: "https://razorpay.me/@example", configured: false });
    expect(settings({}).link).toBe("");
  });
});
