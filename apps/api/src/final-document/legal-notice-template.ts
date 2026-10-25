import type { Notice } from "../documents/notice";
import { legalBasisText } from "../documents/legal-basis";
import { PdfWriter } from "./pdf-writer";

export type LegalNoticeTemplateInput = {
  referenceNumber: string;
  issuedAt: Date;
  reviewedBy: string;
  content: Notice;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lines(value: string | null) {
  if (!value) return "";
  return value
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join("<br>");
}

const WARNING =
  "If you fail to comply within the period stated above, I will be compelled to initiate appropriate legal proceedings against you, entirely at your risk as to costs and consequences. This notice is issued without prejudice to my other rights and remedies.";
const FOOTER =
  "This document was generated from the approved, versioned matter record and completed after human advocate review.";

// Validates the approved content and works out everything both the HTML record and the PDF show.
function prepare(input: LegalNoticeTemplateInput) {
  const { content } = input;
  if (
    content.status !== "READY" ||
    !content.sender ||
    !content.recipient ||
    !content.subject ||
    !content.demand ||
    !content.responsePeriod
  )
    throw new Error("INVALID_APPROVED_DOCUMENT");

  const date = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(input.issuedAt);
  const factTexts = content.paragraphs.filter((paragraph) => paragraph.section !== "DEFAULT").map((paragraph) => paragraph.text);
  const defaultTexts = content.paragraphs.filter((paragraph) => paragraph.section === "DEFAULT").map((paragraph) => paragraph.text);
  const basis = legalBasisText(content.legalBasisIds ?? []).map((text) => `The above conduct is relevant to ${text}`);
  // Paragraph numbers run on across sections.
  let counter = 0;
  const sections = [
    { heading: "Facts", items: factTexts },
    { heading: "Your default", items: defaultTexts },
    { heading: "Legal basis", items: basis },
  ]
    .filter((section) => section.items.length)
    .map((section) => {
      const start = counter + 1;
      counter += section.items.length;
      return { ...section, start };
    });
  return {
    date,
    sender: content.sender,
    recipient: content.recipient,
    subject: content.subject,
    demand: content.demand,
    responsePeriod: content.responsePeriod,
    sections,
  };
}

export function renderLegalNoticeHtml(input: LegalNoticeTemplateInput) {
  const notice = prepare(input);
  const { date, sender, recipient, subject, demand, responsePeriod } = notice;
  const body = [
    `<p>I, <strong>${escapeHtml(sender.name)}</strong>, give you this notice regarding the matter stated below.</p>`,
    ...notice.sections.map((section) =>
      `<h2>${section.heading}</h2><ol start="${section.start}">${section.items.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ol>`),
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>${escapeHtml(input.referenceNumber)} Legal Notice</title>
  <style>
    @page { size: A4; margin: 19mm 18mm 20mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172420; font-family: Georgia, 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.62; }
    header { border-bottom: 2px solid #243a35; padding-bottom: 12px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: end; }
    .brand { font-family: Arial, sans-serif; font-weight: 800; letter-spacing: .13em; font-size: 18pt; color: #243a35; }
    .meta { text-align: right; font: 9.5pt/1.45 Arial, sans-serif; color: #53635e; }
    h1 { text-align: center; font: 700 15pt/1.3 Arial, sans-serif; letter-spacing: .11em; margin: 24px 0; }
    .date { text-align: right; margin-bottom: 18px; }
    .party { margin: 12px 0; }
    .label { display: block; font: 700 8.5pt/1.4 Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #62716c; }
    .subject { margin: 24px 0 18px; padding: 11px 13px; background: #f1f4f2; border-left: 3px solid #315f55; }
    h2 { font: 700 10pt/1.4 Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #315f55; margin: 20px 0 8px; }
    .warning { margin-top: 16px; text-align: justify; }
    ol { padding-left: 24px; }
    li { padding-left: 8px; margin: 0 0 12px; text-align: justify; break-inside: avoid; }
    .demand { margin-top: 20px; padding: 14px; border: 1px solid #b9c5c1; break-inside: avoid; }
    .signature { margin-top: 42px; break-inside: avoid; }
    .signature-line { width: 220px; border-top: 1px solid #243a35; margin-top: 48px; padding-top: 7px; }
    footer { margin-top: 30px; border-top: 1px solid #d8dfdc; padding-top: 9px; font: 8.5pt/1.4 Arial, sans-serif; color: #687772; }
  </style>
</head>
<body>
  <header>
    <div class="brand">LAWMEDY</div>
    <div class="meta">Final advocate-reviewed document<br>${escapeHtml(input.referenceNumber)}</div>
  </header>
  <div class="date"><strong>Date:</strong> ${escapeHtml(date)}</div>
  <div class="party"><span class="label">From</span><strong>${escapeHtml(sender.name)}</strong>${sender.address ? `<br>${lines(sender.address)}` : ""}</div>
  <div class="party"><span class="label">To</span><strong>${escapeHtml(recipient.name)}</strong>${recipient.address ? `<br>${lines(recipient.address)}` : ""}</div>
  <h1>LEGAL NOTICE</h1>
  <div class="subject"><strong>Subject:</strong> ${escapeHtml(subject)}</div>
  <p>Sir/Madam,</p>
  ${body}
  <div class="demand"><span class="label">Demand</span>${escapeHtml(demand)}<br><strong>Response requested:</strong> ${escapeHtml(responsePeriod)}</div>
  <p class="warning">${WARNING}</p>
  <div class="signature">
    <div class="signature-line"><strong>${escapeHtml(input.reviewedBy)}</strong><br>Reviewing Advocate</div>
  </div>
  <footer>${FOOTER}</footer>
</body>
</html>`;
}

export function renderLegalNoticePdf(input: LegalNoticeTemplateInput) {
  const notice = prepare(input);
  const pdf = new PdfWriter(`${input.referenceNumber} Legal Notice`);
  pdf.header("Final advocate-reviewed document", input.referenceNumber);
  pdf.date(notice.date);
  pdf.party("From", notice.sender.name, [notice.sender.address]);
  pdf.party("To", notice.recipient.name, [notice.recipient.address]);
  pdf.title("LEGAL NOTICE", 1.65);
  pdf.subject(notice.subject);
  pdf.paragraph("Sir/Madam,");
  pdf.paragraph(["I, ", { text: notice.sender.name, bold: true }, ", give you this notice regarding the matter stated below."]);
  for (const section of notice.sections) {
    pdf.heading(section.heading);
    pdf.numbered(section.items, section.start);
  }
  pdf.boxed("Demand", [notice.demand, { text: "\nResponse requested:", bold: true }, ` ${notice.responsePeriod}`]);
  pdf.paragraph(WARNING, { align: "justify" });
  pdf.signature(input.reviewedBy, "Reviewing Advocate");
  pdf.footer(FOOTER);
  return pdf.finish();
}
