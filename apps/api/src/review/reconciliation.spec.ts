import { canonicalFactType, normalizeFactValue } from "./reconciliation";

describe("fact reconciliation", () => {
  it("maps related money fields to one comparable type", () => {
    expect(canonicalFactType("loan_amount")).toBe("amount:principal");
    expect(canonicalFactType("Payment value")).toBe("amount:principal");
    expect(canonicalFactType("transfer_amount")).toBe("amount:principal");
  });

  it("does not merge a date into an amount because the key mentions a payment or loan", () => {
    expect(canonicalFactType("payment_date")).toBe("date:event");
    expect(canonicalFactType("loan_date")).toBe("date:event");
    expect(canonicalFactType("repayment_due_date")).toBe("date:due");
  });

  it("keeps different kinds of amounts and dates in separate slots", () => {
    expect(canonicalFactType("interest_amount")).not.toBe(canonicalFactType("loan_amount"));
    expect(canonicalFactType("due_date")).not.toBe(canonicalFactType("agreement_date"));
  });

  it("separates the sender's details from the recipient's", () => {
    expect(canonicalFactType("complainant_name")).toBe("sender_name");
    expect(canonicalFactType("borrower_name")).toBe("recipient_name");
    expect(canonicalFactType("recipient_address")).toBe("recipient_address");
  });

  it("normalizes equivalent Indian currency formats", () => {
    expect(normalizeFactValue("amount:principal", "₹50,000")).toBe("50000");
    expect(normalizeFactValue("amount:principal", "Rs. 50000")).toBe("50000");
    expect(normalizeFactValue("amount:principal", "50,000 rupees")).toBe("50000");
  });

  it("takes the money figure, not a date number, from a mixed value", () => {
    expect(normalizeFactValue("amount:principal", "on 15 March I paid ₹50,000")).toBe("50000");
    expect(normalizeFactValue("amount:principal", "15 March, 50,000")).toBe("50000");
  });

  it("keeps genuinely different amounts distinct", () => {
    expect(normalizeFactValue("amount:principal", "₹50,000")).not.toBe(
      normalizeFactValue("amount:principal", "₹55,000"),
    );
  });

  it("normalizes harmless text spacing and punctuation", () => {
    expect(normalizeFactValue("recipient_name", "  Asha   Rao, ")).toBe("asha rao");
  });
});
