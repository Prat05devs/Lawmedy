import type { RtiDraft } from "../rti/rti";
import { PdfWriter } from "./pdf-writer";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lines = (value: string) => value.split(/\r?\n/).map(escape).join("<br>");

type RtiTemplateInput = { referenceNumber: string; issuedAt: Date; content: RtiDraft };

const REQUEST_TERMS = "I request that the information be supplied within 30 days of receipt of this application as provided in Section 7(1) of the Act. I am enclosing the application fee as prescribed (payable by the mode accepted by the authority). If I am below the poverty line, a copy of my certificate is enclosed and no fee is payable. If the information concerns the life or liberty of a person, it should be supplied within 48 hours. If any part of the information is withheld, please state the provision relied on and the details of the appellate authority.";
const FOOTER = "This document was generated from the user-confirmed, versioned matter record.";

// Validates the content and works out everything both the HTML record and the PDF show.
function prepare(input: RtiTemplateInput) {
  const { content } = input;
  if (content.status !== "READY" || !content.applicant || !content.publicAuthority || !content.subject || !content.informationRequests.length)
    throw new Error("INVALID_APPROVED_DOCUMENT");
  const date = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(input.issuedAt);
  const period = content.period && (content.period.from || content.period.to)
    ? { from: content.period.from || "Beginning of records", to: content.period.to || "Present" } : null;
  return { date, period, applicant: content.applicant, authority: content.publicAuthority, subject: content.subject, requests: content.informationRequests.map((request) => request.text) };
}

export function renderRtiHtml(input: RtiTemplateInput) {
  const { date, applicant, authority, subject, requests, ...rti } = prepare(input);
  const period = rti.period ? `<p><strong>Period:</strong> ${escape(rti.period.from)} to ${escape(rti.period.to)}</p>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escape(input.referenceNumber)} RTI Application</title><style>
  @page{size:A4;margin:19mm 18mm 20mm}*{box-sizing:border-box}body{margin:0;color:#172420;font-family:Georgia,'Times New Roman',serif;font-size:11.5pt;line-height:1.62}header{border-bottom:2px solid #243a35;padding-bottom:12px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:end}.brand{font-family:Arial,sans-serif;font-weight:800;letter-spacing:.13em;font-size:18pt;color:#243a35}.meta{text-align:right;font:9.5pt/1.45 Arial,sans-serif;color:#53635e}h1{text-align:center;font:700 15pt/1.3 Arial,sans-serif;letter-spacing:.08em;margin:24px 0}.date{text-align:right}.party{margin:14px 0}.label{display:block;font:700 8.5pt/1.4 Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#62716c}.subject{margin:22px 0;padding:11px 13px;background:#f1f4f2;border-left:3px solid #315f55}ol{padding-left:24px}li{padding-left:8px;margin:0 0 12px;text-align:justify;break-inside:avoid}.applicant-contact{margin-top:18px;font-size:10.5pt}.signature{margin-top:42px}.signature-line{width:220px;border-top:1px solid #243a35;margin-top:48px;padding-top:7px}footer{margin-top:30px;border-top:1px solid #d8dfdc;padding-top:9px;font:8.5pt/1.4 Arial,sans-serif;color:#687772}
  </style></head><body><header><div class="brand">LAWMEDY</div><div class="meta">RTI application<br>${escape(input.referenceNumber)}</div></header><div class="date"><strong>Date:</strong> ${escape(date)}</div><div class="party"><span class="label">To</span><strong>The Public Information Officer</strong><br>${escape(authority.name)}<br>${escape(authority.department)}<br>${lines(authority.address)}</div><h1>APPLICATION FOR INFORMATION</h1><div class="subject"><strong>Subject:</strong> ${escape(subject)}</div>${period}<p>Sir/Madam,</p><p>I, <strong>${escape(applicant.name)}</strong>, a citizen of India, request the following information under Section 6(1) of the Right to Information Act, 2005:</p><ol>${requests.map((request) => `<li>${escape(request)}</li>`).join("")}</ol><p>${REQUEST_TERMS}</p><div class="applicant-contact"><strong>Applicant:</strong> ${escape(applicant.name)}${applicant.address ? `<br>${lines(applicant.address)}` : ""}${applicant.phone ? `<br>Phone: ${escape(applicant.phone)}` : ""}</div><div class="signature"><div class="signature-line"><strong>${escape(applicant.name)}</strong><br>Applicant</div></div><footer>${FOOTER}</footer></body></html>`;
}

export function renderRtiPdf(input: RtiTemplateInput) {
  const { date, period, applicant, authority, subject, requests } = prepare(input);
  const pdf = new PdfWriter(`${input.referenceNumber} RTI Application`);
  pdf.header("RTI application", input.referenceNumber);
  pdf.date(date);
  pdf.party("To", "The Public Information Officer", [authority.name, authority.department, authority.address]);
  pdf.title("APPLICATION FOR INFORMATION", 1.2);
  pdf.subject(subject);
  if (period) pdf.paragraph([{ text: "Period:", bold: true }, ` ${period.from} to ${period.to}`]);
  pdf.paragraph("Sir/Madam,");
  pdf.paragraph(["I, ", { text: applicant.name, bold: true }, ", a citizen of India, request the following information under Section 6(1) of the Right to Information Act, 2005:"]);
  pdf.numbered(requests, 1);
  pdf.paragraph(REQUEST_TERMS);
  pdf.text(
    [{ text: "Applicant:", bold: true }, ` ${applicant.name}`, applicant.address ? `\n${applicant.address}` : "", applicant.phone ? `\nPhone: ${applicant.phone}` : ""],
    { size: 10.5 },
  );
  pdf.signature(applicant.name, "Applicant");
  pdf.footer(FOOTER);
  return pdf.finish();
}
