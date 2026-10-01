import { parseEvidenceExtraction } from "./extraction";

describe("evidence extraction validation", () => {
  it("accepts grounded structured facts", () => {
    const result = parseEvidenceExtraction(
      JSON.stringify({
        documentType: "BANK_TRANSFER",
        summary: "A transfer receipt showing one payment.",
        confidence: 0.92,
        facts: [
          {
            field: "amount",
            value: "₹50,000",
            sourceText: "Amount ₹50,000",
          },
        ],
      }),
    );
    expect(result.facts[0].value).toBe("₹50,000");
  });

  it("rejects facts without visible source text", () => {
    expect(() =>
      parseEvidenceExtraction(
        JSON.stringify({
          documentType: "RECEIPT",
          summary: "Receipt",
          confidence: 0.5,
          facts: [{ field: "amount", value: "100", sourceText: "" }],
        }),
      ),
    ).toThrow("INVALID_EVIDENCE_RESPONSE");
  });

  it("rejects out-of-range confidence and unknown document types", () => {
    expect(() =>
      parseEvidenceExtraction(
        JSON.stringify({
          documentType: "COURT_ORDER",
          summary: "Document",
          confidence: 2,
          facts: [],
        }),
      ),
    ).toThrow("INVALID_EVIDENCE_RESPONSE");
  });

  it("rejects non-JSON provider output", () => {
    expect(() => parseEvidenceExtraction("Here is the result")).toThrow(
      "INVALID_EVIDENCE_RESPONSE",
    );
  });
});
