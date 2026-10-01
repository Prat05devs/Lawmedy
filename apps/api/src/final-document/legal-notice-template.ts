import type { Notice } from "../documents/notice";

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

export function renderLegalNoticeHtml(input: LegalNoticeTemplateInput) {
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
  const paragraphs = content.paragraphs
    .map((paragraph) => `<li>${escapeHtml(paragraph.text)}</li>`)
    .join("");

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
  <div class="party"><span class="label">From</span><strong>${escapeHtml(content.sender.name)}</strong>${content.sender.address ? `<br>${lines(content.sender.address)}` : ""}</div>
  <div class="party"><span class="label">To</span><strong>${escapeHtml(content.recipient.name)}</strong>${content.recipient.address ? `<br>${lines(content.recipient.address)}` : ""}</div>
  <h1>LEGAL NOTICE</h1>
  <div class="subject"><strong>Subject:</strong> ${escapeHtml(content.subject)}</div>
  <p>Sir/Madam,</p>
  <ol>${paragraphs}</ol>
  <div class="demand"><span class="label">Demand</span>${escapeHtml(content.demand)}<br><strong>Response requested:</strong> ${escapeHtml(content.responsePeriod)}</div>
  <div class="signature">
    <div class="signature-line"><strong>${escapeHtml(input.reviewedBy)}</strong><br>Reviewing Advocate</div>
  </div>
  <footer>This document was generated from the approved, versioned matter record and completed after human advocate review.</footer>
</body>
</html>`;
}
