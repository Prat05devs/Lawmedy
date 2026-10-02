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
        paragraphs: [{ section: "FACTS", text: "₹50,000 remains due.", caseFactIds: [factId] }],
        legalBasisIds: [],
        demand: "Repay ₹50,000.",
        responseDays: 15,
        responsePeriod: "ignored",
      }),
      new Set([factId]),
    );
    expect(result.status).toBe("READY");
    expect(result.responsePeriod).toBe("Within 15 days of receipt of this notice");
  });

  const ready = (extra: object) =>
    JSON.stringify({
      status: "READY",
      missingInformation: [],
      sender: { name: "Priya Sharma", address: null },
      recipient: { name: "Asha Rao", address: "Pune" },
      subject: "Demand",
      paragraphs: [{ section: "FACTS", text: "x", caseFactIds: [factId] }],
      legalBasisIds: [],
      demand: "Repay.",
      responseDays: 15,
      responsePeriod: null,
      ...extra,
    });

  it("accepts a legal basis only from the vetted list for the matter category", () => {
    expect(parseNotice(ready({ legalBasisIds: ["ICA_S73"] }), new Set([factId]), "MONEY_RECOVERY").legalBasisIds).toEqual(["ICA_S73"]);
    expect(() => parseNotice(ready({ legalBasisIds: ["CPA_2019"] }), new Set([factId]), "MONEY_RECOVERY")).toThrow("INVALID_AI_RESPONSE");
    expect(() => parseNotice(ready({ legalBasisIds: ["Section 420 IPC"] }), new Set([factId]), "MONEY_RECOVERY")).toThrow("INVALID_AI_RESPONSE");
  });

  it("rejects a response window outside 7-60 days", () => {
    expect(() => parseNotice(ready({ responseDays: 1 }), new Set([factId]))).toThrow("INVALID_AI_RESPONSE");
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
