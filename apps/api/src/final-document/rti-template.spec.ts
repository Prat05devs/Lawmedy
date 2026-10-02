import { renderRtiHtml } from "./rti-template";

describe("RTI PDF template", () => {
  it("renders the authority and escapes user-controlled content", () => {
    const html = renderRtiHtml({ referenceNumber: "LM-RTI-1", issuedAt: new Date("2026-10-01T00:00:00Z"), content: {
      status: "READY", missingInformation: [], applicant: { name: "A <User>", address: "12 MG Road\nPune", phone: "+91 98765 43210" },
      publicAuthority: { name: "Test Authority", department: "Records", address: "Public Office" },
      subject: "Copies & registers", period: null,
      informationRequests: [{ text: "Provide certified copies.", caseFactIds: [] }],
    } });
    expect(html).toContain("RTI application");
    expect(html).toContain("A &lt;User&gt;");
    expect(html).toContain("Copies &amp; registers");
    expect(html).toContain("Section 6(1) of the Right to Information Act, 2005");
    expect(html).toContain("12 MG Road<br>Pune");
    expect(html).toContain("Section 7(1)");
  });
});
