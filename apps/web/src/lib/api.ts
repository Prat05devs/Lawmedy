import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADVOCATE" | "ADMIN";
};
export type Statement = { id: string; statement: string; createdAt: string };
export type Matter = {
  id: string;
  referenceNumber: string;
  type: "LEGAL_NOTICE" | "RTI";
  status:
    | "DRAFT"
    | "INTAKE_IN_PROGRESS"
    | "READY_FOR_PAYMENT"
    | "PAYMENT_VERIFICATION"
    | "PAID"
    | "AI_PROCESSING"
    | "DRAFT_GENERATED"
    | "UNDER_ADVOCATE_REVIEW"
    | "USER_RESPONSE_REQUIRED"
    | "APPROVED"
    | "COMPLETED";
  createdAt: string;
  updatedAt: string;
  currentStatementId: string | null;
  statements: Statement[];
};
export type ReviewFactValue = {
  id: string;
  value: string;
  source: "STATEMENT" | "ANSWER" | "EVIDENCE";
  sourceLabel: string;
  confirmed: boolean;
};
export type MatterReview = {
  matterType: "LEGAL_NOTICE" | "RTI";
  status:
    | "DRAFT"
    | "INTAKE_IN_PROGRESS"
    | "READY_FOR_PAYMENT"
    | "PAYMENT_VERIFICATION"
    | "PAID"
    | "AI_PROCESSING"
    | "DRAFT_GENERATED"
    | "UNDER_ADVOCATE_REVIEW"
    | "USER_RESPONSE_REQUIRED"
    | "APPROVED"
    | "COMPLETED";
  prepared: boolean;
  factGroups: Array<{
    type: string;
    conflict: boolean;
    selectedId: string | null;
    values: ReviewFactValue[];
  }>;
  recipient: null | {
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
  };
  payment: null | {
    status: "CREATED" | "SUBMITTED" | "PAID" | "FAILED" | "REJECTED";
    amount: number;
    currency: string;
    providerPaymentId?: string | null;
    submittedAt?: string | null;
    reviewNote?: string | null;
  };
  applicant: { address: string | null; phone: string | null };
  pricing: { amount: number; currency: string };
  paymentConfigured: boolean;
  paymentMode: "manual" | "razorpay";
  paymentLink: string;
};
export type PublicAuthority = { id: string; name: string; department: string; governmentLevel: "CENTRAL" | "STATE" | "LOCAL"; state: string | null; address: string; rtiPortalUrl: string | null };
export type RtiDetail = { id: string; matterId: string; governmentLevel: "CENTRAL" | "STATE" | "LOCAL"; state: string | null; department: string; publicAuthorityId: string; subject: string; periodFrom: string | null; periodTo: string | null; publicAuthority: PublicAuthority };
export type MatterDocument = {
  matterType: "LEGAL_NOTICE" | "RTI";
  matterStatus: Matter["status"];
  state:
    | "NOT_STARTED"
    | "PROCESSING"
    | "WAITING_FOR_CONFIGURATION"
    | "MISSING_INFORMATION"
    | "FAILED"
    | "READY";
  configured: boolean;
  message: string | null;
  document: null | {
    id: string;
    versionNumber: number;
    createdAt: string;
    content: {
      status: "READY";
      sender: { name: string; address: string | null };
      recipient: { name: string; address: string | null };
      subject: string;
      paragraphs: Array<{ section?: "FACTS" | "DEFAULT"; text: string; caseFactIds: string[] }>;
      legalBasisIds?: string[];
      demand: string;
      responsePeriod: string;
    } | {
      status: "READY";
      applicant: { name: string };
      publicAuthority: { name: string; department: string; address: string };
      subject: string;
      period: { from: string | null; to: string | null } | null;
      informationRequests: Array<{ text: string; caseFactIds: string[] }>;
    };
    qa: null | { passed: boolean; issueCount: number; warningCount: number };
  };
};
export type FinalDocument =
  | { state: "NOT_READY" | "PENDING"; matterStatus: Matter["status"] }
  | {
      state: "READY";
      matterStatus: Matter["status"];
      filename: string;
      sizeBytes: number;
      generatedAt: string;
      deliveryStatus: "PENDING" | "SENT" | "FAILED" | "SKIPPED_CONFIGURATION";
      downloadUrl: string;
    };
export type EvidenceFact = {
  field: string;
  value: string;
  sourceText: string;
};
export type EvidenceItem = {
  id: string;
  matterId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: "PROCESSING" | "PROCESSED" | "FAILED";
  statusMessage: string | null;
  createdAt: string;
  viewUrl: string;
  extraction: null | {
    status: "SUCCEEDED" | "FAILED";
    confidence: number | null;
    extraction: {
      documentType?: string;
      summary?: string;
      confidence?: number;
      facts?: EvidenceFact[];
    };
  };
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
  timeoutMs = 15000,
): Promise<T> {
  const token = (await cookies()).get("lawmedy_session")?.value;
  if (authenticated && !token) redirect("/login");
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    if (authenticated) headers.set("Authorization", `Bearer ${token}`);
    response = await fetch(
      `${process.env.API_URL || "http://127.0.0.1:4000"}${path}`,
      {
        ...init,
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch {
    throw new ApiError(
      "We could not connect to Lawmedy. Please try again in a moment.",
      503,
    );
  }
  if (response.status === 401 && authenticated) redirect("/login");
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status >= 500
        ? "Something went wrong while saving your request. Please try again."
        : Array.isArray(data.message)
          ? data.message.join(" ")
          : data.message || "Request failed.",
      response.status,
    );
  return data as T;
}
export const statusLabel = {
  DRAFT: "Draft",
  INTAKE_IN_PROGRESS: "Intake in progress",
  READY_FOR_PAYMENT: "Ready for payment",
  PAYMENT_VERIFICATION: "Payment under verification",
  PAID: "Payment verified",
  AI_PROCESSING: "Work in progress",
  DRAFT_GENERATED: "Work in progress",
  UNDER_ADVOCATE_REVIEW: "Under advocate review",
  USER_RESPONSE_REQUIRED: "Your response needed",
  APPROVED: "Finalising your document",
  COMPLETED: "Completed",
};

export type Notification = {
  id: string;
  matterId: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type AdvocateRequests = {
  status: Matter["status"];
  requests: Array<{
    id: string;
    question: string;
    createdAt: string;
    answer: null | { answer: string; createdAt: string; updatedAt: string };
  }>;
};
export function date(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
