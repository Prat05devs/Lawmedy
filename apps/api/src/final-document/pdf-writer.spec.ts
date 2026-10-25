import { splitScripts } from "./pdf-writer";
import { renderLegalNoticePdf } from "./legal-notice-template";
import { renderRtiPdf } from "./rti-template";

const factId = "00000000-0000-4000-8000-000000000001";
const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

describe("splitScripts", () => {
  it("puts Hindi and English in separate runs and keeps punctuation with its run", () => {
    expect(splitScripts("Ravi (रवि कुमार), Pune")).toEqual([
      { text: "Ravi (", devanagari: false },
      { text: "रवि कुमार), ", devanagari: true },
      { text: "Pune", devanagari: false },
    ]);
  });
});

describe("final PDFs", () => {
  const notice = {
    status: "READY" as const,
    missingInformation: [],
    sender: { name: "Ravi Kumar (रवि कुमार)", address: "Pune\nMaharashtra" },
    recipient: { name: "Asha Traders", address: "Mumbai" },
    subject: "Refund of ₹2,50,000",
    paragraphs: [{ section: "FACTS" as const, text: "आपने माल नहीं भेजा। The amount remains unpaid.", caseFactIds: [factId] }],
    legalBasisIds: ["ICA_S73"],
    demand: "Refund ₹2,50,000.",
    responseDays: 15,
    responsePeriod: "Within 15 days",
  };

  it("renders a legal notice without a browser, including Hindi text", async () => {
    const pdf = await renderLegalNoticePdf({ referenceNumber: "MAT-2026-000001", issuedAt: new Date("2026-09-30T10:00:00Z"), reviewedBy: "Advocate Meera", content: notice });
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("NotoSerifDevanagari");
  });

  it("flows a long notice onto further pages", async () => {
    const paragraphs = Array.from({ length: 30 }, () => notice.paragraphs[0]);
    const input = { referenceNumber: "MAT-2026-000001", issuedAt: new Date(), reviewedBy: "Advocate Meera" };
    const short = await renderLegalNoticePdf({ ...input, content: notice });
    const long = await renderLegalNoticePdf({ ...input, content: { ...notice, paragraphs } });
    expect(pageCount(long)).toBeGreaterThan(pageCount(short));
  });

  it("rejects a notice that is not ready", async () => {
    expect(() => renderLegalNoticePdf({ referenceNumber: "MAT-2026-000001", issuedAt: new Date(), reviewedBy: "Advocate Meera", content: { ...notice, status: "MISSING_INFORMATION" } }))
      .toThrow("INVALID_APPROVED_DOCUMENT");
  });

  it("renders an RTI application", async () => {
    const pdf = await renderRtiPdf({ referenceNumber: "LM-RTI-1", issuedAt: new Date("2026-10-01T00:00:00Z"), content: {
      status: "READY", missingInformation: [], applicant: { name: "सीमा शर्मा", address: "Jaipur", phone: null },
      publicAuthority: { name: "Test Authority", department: "Records", address: "Public Office" },
      subject: "Road repair records", period: { from: "1 April 2025", to: null },
      informationRequests: [{ text: "Provide certified copies.", caseFactIds: [factId] }],
    } });
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pageCount(pdf)).toBeGreaterThan(0);
  });
});
