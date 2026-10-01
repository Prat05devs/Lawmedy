import { parseAnalysis } from "./analysis";
const statement =
  "I lent someone ₹50,000 in March and they have not paid me back.";
const valid = {
  category: "MONEY_RECOVERY",
  summary: "The user reports lending money that has not been repaid.",
  facts: [
    {
      key: "amount",
      value: "₹50,000",
      sourceQuote: "I lent someone ₹50,000 in March",
    },
  ],
  missingInformation: [
    { field: "RECIPIENT_NAME", question: "Who did you lend the money to?" },
    { field: "EVENT_DATE", question: "In which year did you lend the money?" },
  ],
};
describe("Grounded case analysis", () => {
  it("accepts structured facts supported by exact source quotes", () =>
    expect(parseAnalysis(JSON.stringify(valid), statement)).toEqual(valid));
  it("rejects a fabricated source quote", () =>
    expect(() =>
      parseAnalysis(
        JSON.stringify({
          ...valid,
          facts: [{ key: "year", value: "2026", sourceQuote: "March 2026" }],
        }),
        statement,
      ),
    ).toThrow("UNSUPPORTED_FACT"));
  it("rejects an invented value inside an otherwise real quote", () =>
    expect(() =>
      parseAnalysis(
        JSON.stringify({
          ...valid,
          facts: [{ ...valid.facts[0], value: "₹75,000" }],
        }),
        statement,
      ),
    ).toThrow("UNSUPPORTED_FACT"));
  it("rejects malformed JSON and markdown fences", () =>
    expect(() => parseAnalysis("```json\n{}\n```", statement)).toThrow());
  it("requires at least two concrete questions", () =>
    expect(() =>
      parseAnalysis(
        JSON.stringify({ ...valid, missingInformation: [] }),
        statement,
      ),
    ).toThrow());
  it("rejects duplicate questions", () =>
    expect(() =>
      parseAnalysis(
        JSON.stringify({
          ...valid,
          missingInformation: [
            valid.missingInformation[0],
            valid.missingInformation[0],
          ],
        }),
        statement,
      ),
    ).toThrow("DUPLICATE_QUESTIONS"));
  it("rejects unexpected legal-content fields", () =>
    expect(() =>
      parseAnalysis(
        JSON.stringify({ ...valid, legalCitation: "Invented law" }),
        statement,
      ),
    ).toThrow());
});
