import { z } from "zod";
import { LEGAL_BASIS_IDS, legalBasisFor } from "./legal-basis";

export const NOTICE_PROMPT_VERSION = "legal-notice-v3-structured";
export const QA_PROMPT_VERSION = "legal-notice-qa-v3-structured";

export const NOTICE_SYSTEM_PROMPT = `You draft the variable body of an Indian legal notice from verified case data. The application supplies the letterhead, the sender and recipient blocks, the opening line, the closing warning and the signature, so do not write those.
Write only these parts, as the schema requires:
- subject: one line naming the dispute.
- paragraphs with section "FACTS": a neutral chronological account (who, when, what was agreed or done, amounts, supporting documents). Cite dates and amounts exactly as confirmed.
- paragraphs with section "DEFAULT": what the recipient failed to do and what the sender has already done to resolve it. Only state steps recorded in the facts.
- legalBasisIds: ids from availableLegalBasis whose appliesWhen condition is clearly met by the confirmed facts. Use an empty list if unsure. Never write statute names, section numbers or case law yourself.
- demand: exactly what the recipient must do (for example, pay a stated amount), using only confirmed facts.
- responseDays: an integer from 7 to 60 (15 unless the facts say otherwise); set responsePeriod to "Within N days of receipt of this notice".
Use supporting evidence files and their extracted text to understand the confirmed facts in context and to word them accurately. Evidence does not authorize adding facts that are absent from confirmed CaseFacts.
Use only the confirmed facts, recipient details, and matter category supplied in the JSON input.
Never use unstated facts, dates, amounts, promises, identities, or legal provisions.
Every paragraph must list one or more exact CaseFact ids that support it. Never cite an evidence ID as a CaseFact.
Write in formal, plain English in the first person ("I"), one idea per paragraph.
If required information is absent, return status MISSING_INFORMATION and name the missing items instead of guessing.
If the input contains previousDraftRejectedByQa, an earlier draft was rejected for those issues: write a corrected draft that avoids every one of them.
Return only JSON matching the requested schema.`;

export const NOTICE_QA_SYSTEM_PROMPT = `You are a factual quality reviewer for a legal notice draft.
Compare the draft with the confirmed CaseFacts and recipient details supplied in the JSON input. Use attached supporting evidence only to verify source context; it cannot justify a claim that is not supported by a confirmed CaseFact.
Flag every unsupported claim, invented detail, inconsistent value, or CaseFact citation that does not support its paragraph.
Flag missing CaseFact citations on any substantive paragraph.
Do not improve or rewrite the notice. Return only JSON matching the requested schema.`;

const partySchema = z.object({
  name: z.string().min(1).max(300),
  address: z.string().max(2000).nullable(),
});

export const noticeSchema = z.object({
  status: z.enum(["READY", "MISSING_INFORMATION"]),
  missingInformation: z.array(z.string().min(1).max(500)).max(20),
  sender: partySchema.nullable(),
  recipient: partySchema.nullable(),
  subject: z.string().min(1).max(1000).nullable(),
  paragraphs: z
    .array(
      z.object({
        section: z.enum(["FACTS", "DEFAULT"]),
        text: z.string().min(1).max(10000),
        caseFactIds: z.array(z.string().uuid()).min(1).max(50),
      }),
    )
    .max(50),
  legalBasisIds: z.array(z.enum(LEGAL_BASIS_IDS)).max(5),
  demand: z.string().min(1).max(5000).nullable(),
  responseDays: z.number().int().min(7).max(60).nullable(),
  responsePeriod: z.string().min(1).max(500).nullable(),
});

export const noticeQaSchema = z.object({
  passed: z.boolean(),
  issues: z
    .array(
      z.object({
        code: z.enum([
          "UNSUPPORTED_CLAIM",
          "INVENTED_DETAIL",
          "INCONSISTENCY",
          "INVALID_FACT_REFERENCE",
        ]),
        description: z.string().min(1).max(2000),
        paragraphIndex: z.number().int().min(0).nullable(),
        caseFactIds: z.array(z.string().uuid()).max(50),
      }),
    )
    .max(100),
  warnings: z.array(z.string().min(1).max(2000)).max(100),
});

export type Notice = z.infer<typeof noticeSchema>;
export type NoticeQa = z.infer<typeof noticeQaSchema>;

function json(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("INVALID_AI_RESPONSE");
  }
}

export function parseNotice(text: string, allowedFactIds: Set<string>, category = "OTHER") {
  const parsed = noticeSchema.safeParse(json(text));
  if (!parsed.success) throw new Error("INVALID_AI_RESPONSE");
  if (
    parsed.data.paragraphs.some((paragraph) =>
      paragraph.caseFactIds.some((id) => !allowedFactIds.has(id)),
    )
  )
    throw new Error("INVALID_AI_RESPONSE");
  const allowedBasis = new Set(legalBasisFor(category).map((item) => item.id));
  if (parsed.data.legalBasisIds.some((id) => !allowedBasis.has(id)))
    throw new Error("INVALID_AI_RESPONSE");
  if (parsed.data.responseDays)
    parsed.data.responsePeriod = `Within ${parsed.data.responseDays} days of receipt of this notice`;
  if (
    parsed.data.status === "READY" &&
    (!parsed.data.sender ||
      !parsed.data.recipient ||
      !parsed.data.subject ||
      !parsed.data.paragraphs.length ||
      !parsed.data.demand ||
      !parsed.data.responsePeriod)
  )
    throw new Error("INVALID_AI_RESPONSE");
  if (
    parsed.data.status === "MISSING_INFORMATION" &&
    !parsed.data.missingInformation.length
  )
    throw new Error("INVALID_AI_RESPONSE");
  return parsed.data;
}

export function parseNoticeQa(text: string, allowedFactIds: Set<string>) {
  const parsed = noticeQaSchema.safeParse(json(text));
  if (!parsed.success) throw new Error("INVALID_AI_RESPONSE");
  if (
    parsed.data.issues.some((issue) =>
      issue.caseFactIds.some((id) => !allowedFactIds.has(id)),
    )
  )
    throw new Error("INVALID_AI_RESPONSE");
  return parsed.data;
}
