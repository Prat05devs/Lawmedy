import { parseRti, parseRtiQa } from "./rti";

const factId = "11111111-1111-4111-8111-111111111111";

describe("RTI AI response validation", () => {
  it("accepts a grounded structured information request", () => {
    const draft = parseRti(JSON.stringify({
      status: "READY", missingInformation: [], applicant: { name: "Test User", address: "12 MG Road, Pune", phone: null },
      publicAuthority: { name: "Railway Board", department: "Ministry of Railways", address: "Rail Bhawan, New Delhi" },
      subject: "Inspection records", period: { from: "2025-01-01", to: "2025-12-31" },
      informationRequests: [{ text: "Provide certified copies of the inspection records described by the applicant.", caseFactIds: [factId] }],
    }), new Set([factId]));
    expect(draft.status).toBe("READY");
  });

  it("rejects an unconfirmed CaseFact reference", () => {
    expect(() => parseRti(JSON.stringify({
      status: "READY", missingInformation: [], applicant: { name: "Test User", address: "12 MG Road, Pune", phone: null },
      publicAuthority: { name: "Authority", department: "Department", address: "Address" },
      subject: "Records", period: null,
      informationRequests: [{ text: "Provide the records.", caseFactIds: [factId] }],
    }), new Set())).toThrow("INVALID_AI_RESPONSE");
  });

  it("validates RTI QA references", () => {
    expect(parseRtiQa(JSON.stringify({ passed: true, issues: [], warnings: [] }), new Set([factId])).passed).toBe(true);
  });
});
