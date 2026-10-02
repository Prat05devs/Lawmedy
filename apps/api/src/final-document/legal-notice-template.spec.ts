import { renderLegalNoticeHtml } from "./legal-notice-template";

describe("renderLegalNoticeHtml", () => {
  const notice = {
    status: "READY" as const,
    missingInformation: [],
    sender: { name: "Ravi & Sons", address: "Pune\nMaharashtra" },
    recipient: { name: "Asha <Rao>", address: "Mumbai" },
    subject: "Demand for repayment",
    paragraphs: [
      {
        section: "FACTS" as const,
        text: "The confirmed amount remains unpaid.",
        caseFactIds: ["00000000-0000-4000-8000-000000000001"],
      },
    ],
    legalBasisIds: ["ICA_S73"],
    demand: "Repay the confirmed amount.",
    responseDays: 15,
    responsePeriod: "Within 15 days",
  };

  it("renders the approved content in the fixed layout and escapes HTML", () => {
    const html = renderLegalNoticeHtml({
      referenceNumber: "MAT-2026-000001",
      issuedAt: new Date("2026-09-30T10:00:00.000Z"),
      reviewedBy: "Advocate Meera",
      content: notice,
    });

    expect(html).toContain("MAT-2026-000001");
    expect(html).toContain("30 September 2026");
    expect(html).toContain("Ravi &amp; Sons");
    expect(html).toContain("Asha &lt;Rao&gt;");
    expect(html).toContain("The confirmed amount remains unpaid.");
    expect(html).toContain("Advocate Meera");
    expect(html).not.toContain("Asha <Rao>");
    expect(html).toContain("Section 73 of the Indian Contract Act, 1872");
    expect(html).toContain("<h2>Facts</h2>");
    expect(html).toContain("legal proceedings");
  });

  it("rejects content that is not ready for delivery", () => {
    expect(() =>
      renderLegalNoticeHtml({
        referenceNumber: "MAT-2026-000001",
        issuedAt: new Date(),
        reviewedBy: "Advocate Meera",
        content: { ...notice, status: "MISSING_INFORMATION" },
      }),
    ).toThrow("INVALID_APPROVED_DOCUMENT");
  });
});
