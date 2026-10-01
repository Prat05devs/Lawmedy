import { parseNotice, parseNoticeQa } from "./notice";

const factId = "11111111-1111-4111-8111-111111111111";

describe("legal notice AI output validation", () => {
  it("accepts a complete draft supported by confirmed fact ids", () => {
    const result = parseNotice(
      JSON.stringify({
        status: "READY",
        missingInformation: [],
        sender: { name: "Priya Sharma", address: null },
        recipient: { name: "Asha Rao", address: "Pune" },
        subject: "Demand for repayment",
        paragraphs: [{ text: "₹50,000 remains due.", caseFactIds: [factId] }],
        demand: "Repay ₹50,000.",
        responsePeriod: "Within 15 days",
      }),
      new Set([factId]),
    );
    expect(result.status).toBe("READY");
  });

  it("rejects a paragraph that cites an unknown fact", () => {
    expect(() =>
      parseNotice(
        JSON.stringify({
          status: "READY",
          missingInformation: [],
          sender: { name: "Priya Sharma", address: null },
          recipient: { name: "Asha Rao", address: "Pune" },
          subject: "Demand",
          paragraphs: [
            {
              text: "An unsupported claim.",
              caseFactIds: ["22222222-2222-4222-8222-222222222222"],
            },
          ],
          demand: "Repay.",
          responsePeriod: "Within 15 days",
        }),
        new Set([factId]),
      ),
    ).toThrow("INVALID_AI_RESPONSE");
  });

  it("requires missing items when generation cannot proceed", () => {
    expect(() =>
      parseNotice(
        JSON.stringify({
          status: "MISSING_INFORMATION",
          missingInformation: [],
          sender: null,
          recipient: null,
          subject: null,
          paragraphs: [],
          demand: null,
          responsePeriod: null,
        }),
        new Set(),
      ),
    ).toThrow("INVALID_AI_RESPONSE");
  });

  it("validates QA fact references", () => {
    expect(
      parseNoticeQa(
        JSON.stringify({
          passed: false,
          issues: [
            {
              code: "UNSUPPORTED_CLAIM",
              description: "The amount is unsupported.",
              paragraphIndex: 0,
              caseFactIds: [factId],
            },
          ],
          warnings: [],
        }),
        new Set([factId]),
      ).passed,
    ).toBe(false);
  });
});
