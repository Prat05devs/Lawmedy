import { normalizeWhatsapp } from "./whatsapp";

describe("normalizeWhatsapp", () => {
  it.each([
    ["98765 43210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["0091 9876543210", "+919876543210"],
    ["+44 7700 900123", "+447700900123"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
  });

  it.each(["12345", "5876543210", "+91 12345 67890", "phone", "+0 1234567890"])("rejects %s", (input) => {
    expect(normalizeWhatsapp(input)).toBeNull();
  });
});
