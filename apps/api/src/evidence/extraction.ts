import { z } from "zod";

export const EVIDENCE_PROMPT_VERSION = "evidence-extraction-v1";
export const EVIDENCE_SYSTEM_PROMPT = `You extract only facts visibly present in a user-provided evidence file.
Return JSON matching the supplied schema. Classify the document as BANK_TRANSFER, CHAT_SCREENSHOT, AGREEMENT, RECEIPT, or OTHER.
Never guess, infer, complete, normalize, or invent a name, amount, date, account number, reference number, or legal claim.
For every fact, include the exact visible text that supports it in sourceText. Omit unreadable or uncertain values.
Keep the summary factual and explicitly say when the file is unreadable or contains no extractable facts.`;

export const evidenceExtractionSchema = z.object({
  documentType: z.enum([
    "BANK_TRANSFER",
    "CHAT_SCREENSHOT",
    "AGREEMENT",
    "RECEIPT",
    "OTHER",
  ]),
  summary: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  facts: z
    .array(
      z.object({
        field: z.string().min(1).max(80),
        value: z.string().min(1).max(500),
        sourceText: z.string().min(1).max(1000),
      }),
    )
    .max(30),
});


export function parseEvidenceExtraction(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("INVALID_EVIDENCE_RESPONSE");
  }
  const result = evidenceExtractionSchema.safeParse(value);
  if (!result.success) throw new Error("INVALID_EVIDENCE_RESPONSE");
  return result.data;
}
