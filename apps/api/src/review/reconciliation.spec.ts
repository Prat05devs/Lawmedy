import { canonicalFactType, normalizeFactValue } from "./reconciliation";

describe("fact reconciliation", () => {
  it("maps related money fields to one comparable type", () => {
    expect(canonicalFactType("loan_amount")).toBe("amount");
    expect(canonicalFactType("Payment value")).toBe("amount");
  });

  it("normalizes equivalent Indian currency formats", () => {
    expect(normalizeFactValue("amount", "₹50,000")).toBe("50000");
    expect(normalizeFactValue("amount", "Rs. 50000")).toBe("50000");
  });

  it("keeps genuinely different amounts distinct", () => {
    expect(normalizeFactValue("amount", "₹50,000")).not.toBe(
      normalizeFactValue("amount", "₹55,000"),
    );
  });

  it("normalizes harmless text spacing and punctuation", () => {
    expect(normalizeFactValue("recipient_name", "  Asha   Rao, ")).toBe(
      "asha rao",
    );
  });
});
