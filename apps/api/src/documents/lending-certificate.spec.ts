import { parseCertificate } from "./lending-certificate";
describe("grounded lending certificate", () => {
  const draft = { status: "READY", missingInformation: [], lender: { name: "A", address: null }, borrower: { name: "B", address: null },
    subject: "Record of money lent", paragraphs: [{ text: "A reports paying B ₹5,000.", caseFactIds: ["fact1"] }] };
  it("requires known supporting fact references", () => {
    expect(parseCertificate(JSON.stringify(draft), new Set(["fact1"])).status).toBe("READY");
    expect(() => parseCertificate(JSON.stringify(draft), new Set())).toThrow();
  });
  it("does not accept an empty ready certificate or a missing-information result without questions", () => {
    expect(() => parseCertificate(JSON.stringify({ ...draft, paragraphs: [] }), new Set())).toThrow();
    expect(() => parseCertificate(JSON.stringify({ ...draft, status: "MISSING_INFORMATION" }), new Set(["fact1"]))).toThrow();
  });
});
