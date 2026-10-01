import { z } from "zod";

export const NOTICE_PROMPT_VERSION = "legal-notice-v1";
export const QA_PROMPT_VERSION = "legal-notice-qa-v1";

export const NOTICE_SYSTEM_PROMPT = `You draft Indian legal notices from verified case data.
Use only the confirmed facts, recipient details, and matter category supplied in the JSON input.
Never use unstated facts, dates, amounts, promises, identities, legal provisions, or citations.
Every substantive paragraph must list the exact CaseFact ids that support it.
If required information is absent, return status MISSING_INFORMATION and name the missing items instead of guessing.
Return only JSON matching the requested schema.`;

export const NOTICE_QA_SYSTEM_PROMPT = `You are a factual quality reviewer for a legal notice draft.
Compare the draft only with the confirmed CaseFacts and recipient details supplied in the JSON input.
Flag every unsupported claim, invented detail, inconsistent value, or CaseFact citation that does not support its paragraph.
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
        text: z.string().min(1).max(10000),
        caseFactIds: z.array(z.string().uuid()).max(50),
      }),
    )
    .max(50),
  demand: z.string().min(1).max(5000).nullable(),
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

export function parseNotice(text: string, allowedFactIds: Set<string>) {
  const parsed = noticeSchema.safeParse(json(text));
  if (!parsed.success) throw new Error("INVALID_AI_RESPONSE");
  if (
    parsed.data.paragraphs.some((paragraph) =>
      paragraph.caseFactIds.some((id) => !allowedFactIds.has(id)),
    )
  )
    throw new Error("INVALID_AI_RESPONSE");
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
