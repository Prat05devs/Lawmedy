import { z } from "zod";

export const RTI_PROMPT_VERSION = "rti-generation-v1";
export const RTI_QA_PROMPT_VERSION = "rti-qa-v1";

export const RTI_SYSTEM_PROMPT = `You draft a factual Indian Right to Information application from verified matter data.
Use only the confirmed CaseFacts and the supplied public-authority details, subject and period.
Write precise requests for existing records or information. Do not ask the authority to give opinions, explanations, create new information, or resolve a grievance.
Never invent facts, dates, amounts, identities, record names, offices, legal provisions or citations.
Every information request must list the exact CaseFact ids that support it. If required information is absent, return MISSING_INFORMATION instead of guessing.
Return only JSON matching the supplied schema.`;

export const RTI_QA_SYSTEM_PROMPT = `You are a factual quality reviewer for an RTI application.
Compare the draft only with the confirmed CaseFacts and RTI details supplied in the JSON input.
Flag unsupported or invented details, invalid CaseFact references, and requests that ask for opinions or grievance resolution rather than identifiable records.
Do not rewrite the application. Return only JSON matching the supplied schema.`;

export const rtiSchema = z.object({
  status: z.enum(["READY", "MISSING_INFORMATION"]),
  missingInformation: z.array(z.string().min(1).max(500)).max(20),
  applicant: z.object({ name: z.string().min(1).max(300) }).nullable(),
  publicAuthority: z.object({
    name: z.string().min(1).max(300),
    department: z.string().min(1).max(300),
    address: z.string().min(1).max(2000),
  }).nullable(),
  subject: z.string().min(1).max(1000).nullable(),
  period: z.object({ from: z.string().nullable(), to: z.string().nullable() }).nullable(),
  informationRequests: z.array(z.object({
    text: z.string().min(1).max(5000),
    caseFactIds: z.array(z.string().uuid()).max(50),
  })).max(50),
});

export const rtiQaSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    code: z.enum(["UNSUPPORTED_CLAIM", "INVENTED_DETAIL", "INVALID_FACT_REFERENCE", "NOT_AN_INFORMATION_REQUEST"]),
    description: z.string().min(1).max(2000),
    requestIndex: z.number().int().min(0).nullable(),
    caseFactIds: z.array(z.string().uuid()).max(50),
  })).max(100),
  warnings: z.array(z.string().min(1).max(2000)).max(100),
});

export type RtiDraft = z.infer<typeof rtiSchema>;

function json(text: string) {
  try { return JSON.parse(text) as unknown; }
  catch { throw new Error("INVALID_AI_RESPONSE"); }
}

export function parseRti(text: string, allowedFactIds: Set<string>) {
  const parsed = rtiSchema.safeParse(json(text));
  if (!parsed.success) throw new Error("INVALID_AI_RESPONSE");
  if (parsed.data.informationRequests.some((request) =>
    request.caseFactIds.some((id) => !allowedFactIds.has(id))))
    throw new Error("INVALID_AI_RESPONSE");
  if (parsed.data.status === "READY" &&
    (!parsed.data.applicant || !parsed.data.publicAuthority || !parsed.data.subject || !parsed.data.informationRequests.length))
    throw new Error("INVALID_AI_RESPONSE");
  if (parsed.data.status === "MISSING_INFORMATION" && !parsed.data.missingInformation.length)
    throw new Error("INVALID_AI_RESPONSE");
  return parsed.data;
}

export function parseRtiQa(text: string, allowedFactIds: Set<string>) {
  const parsed = rtiQaSchema.safeParse(json(text));
  if (!parsed.success || parsed.data.issues.some((issue) =>
    issue.caseFactIds.some((id) => !allowedFactIds.has(id))))
    throw new Error("INVALID_AI_RESPONSE");
  return parsed.data;
}
