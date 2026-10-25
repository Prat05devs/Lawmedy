import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import path from "node:path";

// Final PDFs are drawn with pdfkit and fonts bundled in apps/api/assets/fonts, so they
// render the same on any host without a browser or system fonts installed.
const FONT_DIR = path.join(__dirname, "..", "..", "assets", "fonts");
const FONT_FILES = {
  serif: "NotoSerif-Regular.ttf",
  serifBold: "NotoSerif-Bold.ttf",
  sans: "NotoSans-Regular.ttf",
  sansBold: "NotoSans-Bold.ttf",
  deva: "NotoSerifDevanagari-Regular.ttf",
  devaBold: "NotoSerifDevanagari-Bold.ttf",
} as const;
type FontName = keyof typeof FONT_FILES;
let fontData: Record<FontName, Buffer> | undefined;
function fonts() {
  fontData ??= Object.fromEntries(
    Object.entries(FONT_FILES).map(([name, file]) => [name, readFileSync(path.join(FONT_DIR, file))]),
  ) as Record<FontName, Buffer>;
  return fontData;
}

const color = {
  ink: "#172420",
  brand: "#243a35",
  meta: "#53635e",
  label: "#62716c",
  accent: "#315f55",
  shade: "#f1f4f2",
  border: "#b9c5c1",
  rule: "#d8dfdc",
  footer: "#687772",
};

// A4, with the same margins the HTML layout used (19mm 18mm 20mm).
const mm = (value: number) => (value * 72) / 25.4;
const PAGE = { width: 595.28, height: 841.89, top: mm(19), side: mm(18), bottom: mm(20) };
const BODY_SIZE = 11;
const BODY_GAP = 3;

export type Run = string | { text: string; bold?: boolean };
type TextOptions = {
  family?: "serif" | "sans";
  size?: number;
  color?: string;
  bold?: boolean;
  align?: "left" | "right" | "center" | "justify";
  spacing?: number;
  lineGap?: number;
  x?: number;
  y?: number;
  width?: number;
};

const DEVANAGARI = /[ऀ-ॿ꣠-ꣿ᳐-᳿]/;
const NEUTRAL = /[\s\p{P}\p{S}\p{N}]/u;

// Splits text into runs per script so Hindi uses the Devanagari font and everything else
// the Latin one. Spaces, punctuation and digits stay with the run they appear in.
export function splitScripts(text: string) {
  const parts: { text: string; devanagari: boolean }[] = [];
  for (const char of text) {
    const last = parts[parts.length - 1];
    const devanagari = DEVANAGARI.test(char)
      ? true
      : NEUTRAL.test(char) && last ? last.devanagari : false;
    if (last && last.devanagari === devanagari) last.text += char;
    else parts.push({ text: char, devanagari });
  }
  return parts;
}

export class PdfWriter {
  readonly doc: PDFKit.PDFDocument;
  readonly left = PAGE.side;
  readonly width = PAGE.width - 2 * PAGE.side;
  private measurer?: PdfWriter;

  constructor(title: string, private readonly measuring = false) {
    this.doc = new PDFDocument({
      size: measuring ? [PAGE.width, 100_000] : "A4",
      margins: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.side, right: PAGE.side },
      info: { Title: title, Author: "Lawmedy" },
    });
    for (const [name, data] of Object.entries(fonts())) this.doc.registerFont(name, data);
  }

  private get bottom() {
    return this.doc.page.height - PAGE.bottom;
  }

  // Draws text that may mix bold and regular runs and Hindi and English. Each line break
  // starts a fresh pdfkit paragraph, because pdfkit misplaces new lines inside continued text.
  text(content: Run | Run[], options: TextOptions = {}) {
    const lines: { text: string; bold: boolean }[][] = [[]];
    for (const run of Array.isArray(content) ? content : [content]) {
      const { text, bold } = typeof run === "string" ? { text: run, bold: undefined } : run;
      text.replace(/\r\n?/g, "\n").split("\n").forEach((part, index) => {
        if (index > 0) lines.push([]);
        if (part) lines[lines.length - 1].push({ text: part, bold: bold ?? options.bold ?? false });
      });
    }
    if (lines.every((line) => !line.length)) return;
    const x = options.x ?? this.left;
    const width = options.width ?? this.width;
    const align = options.align ?? "left";
    const settings = { lineGap: options.lineGap ?? BODY_GAP, characterSpacing: options.spacing ?? 0 };
    const fontFor = (segment: { devanagari: boolean; bold: boolean }): FontName =>
      segment.devanagari
        ? segment.bold ? "devaBold" : "deva"
        : `${options.family ?? "serif"}${segment.bold ? "Bold" : ""}` as FontName;
    this.doc.fillColor(options.color ?? color.ink).fontSize(options.size ?? BODY_SIZE);
    lines.forEach((line, lineIndex) => {
      const y = lineIndex === 0 ? options.y ?? this.doc.y : this.doc.y;
      const segments = line.flatMap((run) => splitScripts(run.text).map((part) => ({ ...part, bold: run.bold })));
      if (!segments.length) segments.push({ text: " ", devanagari: false, bold: false });
      // pdfkit aligns each continued piece on its own, so right/centred mixed text is
      // placed by hand when it fits on one line.
      let lineX = x;
      let lineWidth = width;
      let lineAlign = align;
      if (segments.length > 1 && (align === "right" || align === "center")) {
        const total = segments.reduce(
          (sum, segment) => sum + this.doc.font(fontFor(segment)).widthOfString(segment.text, settings),
          0,
        );
        if (total < width) {
          lineX = x + (align === "right" ? width - total : (width - total) / 2);
          lineWidth = total + 2;
          lineAlign = "left";
        }
      }
      segments.forEach((segment, index) => {
        this.doc.font(fontFor(segment));
        const pieceOptions = { ...settings, width: lineWidth, align: lineAlign, continued: index < segments.length - 1 };
        if (index === 0) this.doc.text(segment.text, lineX, y, pieceOptions);
        else this.doc.text(segment.text, pieceOptions);
      });
    });
    this.doc.x = this.left;
  }

  heightOf(content: Run | Run[], options: TextOptions = {}) {
    this.measurer ??= new PdfWriter("measure", true);
    const start = PAGE.top;
    this.measurer.text(content, { ...options, y: start });
    const height = this.measurer.doc.y - start;
    this.measurer.doc.y = start;
    return height;
  }

  gap(points: number) {
    this.doc.y += points;
    if (this.doc.y > this.bottom) this.newPage();
  }

  // Starts a new page if the next block would not fit (CSS break-inside: avoid).
  keep(height: number) {
    const page = this.bottom - PAGE.top;
    if (height <= page && this.doc.y + height > this.bottom) this.newPage();
  }

  private newPage() {
    this.doc.addPage();
    this.doc.y = PAGE.top;
  }

  private rule(y: number, x1: number, x2: number, lineWidth: number, stroke: string) {
    this.doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lineWidth).strokeColor(stroke).stroke().restore();
  }

  header(kind: string, referenceNumber: string) {
    const top = this.doc.y;
    const meta = { family: "sans" as const, size: 9.5, color: color.meta, align: "right" as const, lineGap: 1.5 };
    const brand = { family: "sans" as const, size: 18, bold: true, color: color.brand, spacing: 2.3, lineGap: 0 };
    const metaHeight = this.heightOf(`${kind}\n${referenceNumber}`, meta);
    const brandHeight = this.heightOf("LAWMEDY", brand);
    this.text(`${kind}\n${referenceNumber}`, { ...meta, y: top });
    this.text("LAWMEDY", { ...brand, y: top + Math.max(0, metaHeight - brandHeight) });
    const line = top + Math.max(metaHeight, brandHeight) + 9;
    this.rule(line, this.left, this.left + this.width, 1.5, color.brand);
    this.doc.y = line + 16.5;
  }

  date(value: string) {
    this.text([{ text: "Date:", bold: true }, ` ${value}`], { align: "right" });
    this.gap(13.5);
  }

  label(value: string) {
    this.text(value.toUpperCase(), { family: "sans", size: 8.5, bold: true, color: color.label, spacing: 0.85, lineGap: 1 });
  }

  party(label: string, name: string, lines: (string | null | undefined)[] = []) {
    this.gap(9);
    this.label(label);
    this.text([{ text: name, bold: true }, ...lines.filter((line): line is string => !!line).map((line) => `\n${line}`)]);
    this.gap(9);
  }

  title(value: string, spacing: number) {
    this.gap(18);
    this.text(value, { family: "sans", size: 15, bold: true, align: "center", spacing, lineGap: 2 });
    this.gap(18);
  }

  subject(value: string) {
    const padX = 9.75;
    const padY = 8.25;
    const bar = 2.25;
    const content: Run[] = [{ text: "Subject:", bold: true }, ` ${value}`];
    const textOptions = { x: this.left + bar + padX, width: this.width - bar - 2 * padX };
    const height = this.heightOf(content, textOptions) + 2 * padY;
    this.gap(16.5);
    this.keep(height);
    const top = this.doc.y;
    this.doc.save().rect(this.left, top, this.width, height).fill(color.shade).rect(this.left, top, bar, height).fill(color.accent).restore();
    this.text(content, { ...textOptions, y: top + padY });
    this.doc.y = top + height;
    this.gap(13.5);
  }

  paragraph(content: Run | Run[], options: TextOptions = {}) {
    this.text(content, options);
    this.gap(BODY_SIZE);
  }

  heading(value: string) {
    this.gap(4);
    this.keep(60);
    this.text(value.toUpperCase(), { family: "sans", size: 10, bold: true, color: color.accent, spacing: 1, lineGap: 1.5 });
    this.gap(6);
  }

  numbered(items: string[], start: number) {
    const numberWidth = 18;
    const x = this.left + numberWidth + 6;
    const width = this.width - numberWidth - 6;
    items.forEach((item, index) => {
      this.keep(this.heightOf(item, { x, width, align: "justify" }));
      const top = this.doc.y;
      this.text(`${start + index}.`, { y: top, width: numberWidth, align: "right" });
      this.text(item, { x, y: top, width, align: "justify" });
      this.gap(9);
    });
    this.gap(BODY_SIZE - 9);
  }

  boxed(label: string, content: Run[]) {
    const pad = 10.5;
    const inner = { x: this.left + pad, width: this.width - 2 * pad };
    const labelOptions = { family: "sans" as const, size: 8.5, bold: true, spacing: 0.85, lineGap: 1, ...inner };
    const height = this.heightOf(label.toUpperCase(), labelOptions) + this.heightOf(content, inner) + 2 * pad;
    this.gap(15);
    this.keep(height);
    const top = this.doc.y;
    this.doc.save().rect(this.left, top, this.width, height).lineWidth(0.75).strokeColor(color.border).stroke().restore();
    this.text(label.toUpperCase(), { ...labelOptions, color: color.label, y: top + pad });
    this.text(content, inner);
    this.doc.y = top + height;
    this.gap(12);
  }

  signature(name: string, role: string) {
    const lineWidth = 165;
    this.keep(31.5 + 36 + 5 + this.heightOf([{ text: name, bold: true }, `\n${role}`], { width: lineWidth }));
    this.gap(31.5 + 36);
    this.rule(this.doc.y, this.left, this.left + lineWidth, 0.75, color.brand);
    this.gap(5);
    this.text([{ text: name, bold: true }, `\n${role}`], { width: lineWidth });
  }

  footer(value: string) {
    const options = { family: "sans" as const, size: 8.5, color: color.footer, lineGap: 1.5 };
    this.gap(22.5);
    this.keep(7 + this.heightOf(value, options));
    this.rule(this.doc.y, this.left, this.left + this.width, 0.75, color.rule);
    this.gap(6.75);
    this.text(value, options);
  }

  finish() {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);
      this.doc.end();
    });
  }
}
