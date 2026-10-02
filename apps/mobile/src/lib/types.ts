export type User = { id: string; email: string; fullName: string; role: "USER" | "ADVOCATE" | "ADMIN" };
export type MatterType = "LEGAL_NOTICE" | "RTI";
export type MatterStatus =
  | "DRAFT" | "INTAKE_IN_PROGRESS" | "READY_FOR_PAYMENT" | "PAYMENT_VERIFICATION" | "PAID" | "AI_PROCESSING"
  | "DRAFT_GENERATED" | "UNDER_ADVOCATE_REVIEW" | "USER_RESPONSE_REQUIRED" | "APPROVED" | "COMPLETED";
export type Statement = { id: string; statement: string; createdAt: string };
export type Matter = {
  id: string; referenceNumber: string; type: MatterType; status: MatterStatus;
  createdAt: string; updatedAt: string; currentStatementId: string | null; statements: Statement[];
};
export type Notification = { id: string; matterId: string; title: string; message: string; readAt: string | null; createdAt: string };
export type Intake = {
  status: "NOT_STARTED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  message?: string;
  allAnswered?: boolean;
  analysis: null | {
    id: string; statementId: string; category: string; summary: string;
    facts: { key: string; value: string; sourceQuote: string }[];
    missingInformation: { field: string; question: string }[];
    questions: { id: string; question: string; answer: null | { answer: string } }[];
  };
};
export type EvidenceItem = {
  id: string; matterId: string; originalFilename: string; mimeType: string; sizeBytes: number;
  status: "PROCESSING" | "PROCESSED" | "FAILED"; statusMessage: string | null; createdAt: string; viewUrl: string;
  extraction: null | {
    status: "SUCCEEDED" | "FAILED"; confidence: number | null;
    extraction: { documentType?: string; summary?: string; confidence?: number; facts?: { field: string; value: string; sourceText: string }[] };
  };
};
export type ReviewFactValue = { id: string; value: string; source: "STATEMENT" | "ANSWER" | "EVIDENCE"; sourceLabel: string; confirmed: boolean };
export type MatterReview = {
  matterType: MatterType; status: MatterStatus; prepared: boolean;
  factGroups: { type: string; conflict: boolean; selectedId: string | null; values: ReviewFactValue[] }[];
  recipient: null | { name: string; address: string; phone: string | null; email: string | null };
  applicant: { address: string | null; phone: string | null };
  payment: null | { status: "CREATED" | "SUBMITTED" | "PAID" | "FAILED" | "REJECTED"; amount: number; currency: string; providerPaymentId?: string | null; submittedAt?: string | null; reviewNote?: string | null };
  pricing: { amount: number; currency: string };
  paymentConfigured: boolean;
  paymentMode: "manual" | "razorpay";
  paymentLink: string;
};
export type PublicAuthority = { id: string; name: string; department: string; governmentLevel: "CENTRAL" | "STATE" | "LOCAL"; state: string | null; address: string };
export type RtiDetail = {
  id: string; governmentLevel: "CENTRAL" | "STATE" | "LOCAL"; state: string | null; department: string;
  publicAuthorityId: string; subject: string; periodFrom: string | null; periodTo: string | null; publicAuthority: PublicAuthority;
};
export type NoticeContent = {
  status: "READY"; sender: { name: string; address: string | null }; recipient: { name: string; address: string | null };
  subject: string; paragraphs: { section?: "FACTS" | "DEFAULT"; text: string; caseFactIds: string[] }[];
  legalBasisIds?: string[]; demand: string; responsePeriod: string;
};
export type RtiContent = {
  status: "READY"; applicant: { name: string; address?: string | null; phone?: string | null };
  publicAuthority: { name: string; department: string; address: string }; subject: string;
  period: { from: string | null; to: string | null } | null; informationRequests: { text: string; caseFactIds: string[] }[];
};
export type MatterDocument = {
  matterType: MatterType; matterStatus: MatterStatus;
  state: "NOT_STARTED" | "PROCESSING" | "WAITING_FOR_CONFIGURATION" | "MISSING_INFORMATION" | "FAILED" | "READY";
  configured: boolean; message: string | null;
  document: null | { id: string; versionNumber: number; createdAt: string; content: NoticeContent | RtiContent; qa: null | { passed: boolean; issueCount: number; warningCount: number } };
};
export type FinalDocument =
  | { state: "NOT_READY" | "PENDING"; matterStatus: MatterStatus }
  | { state: "READY"; matterStatus: MatterStatus; filename: string; sizeBytes: number; generatedAt: string; deliveryStatus: string; downloadUrl: string };
export type AdvocateRequests = {
  status: MatterStatus;
  requests: { id: string; question: string; answer: null | { answer: string } }[];
};
export type CheckoutDetails = {
  keyId: string; orderId: string; amount: number; currency: string; name: string; description: string;
  prefill: { name: string; email: string };
};
export const statusLabel: Record<MatterStatus, string> = {
  DRAFT: "Draft", INTAKE_IN_PROGRESS: "Intake in progress", READY_FOR_PAYMENT: "Ready for payment",
  PAYMENT_VERIFICATION: "Payment under verification", PAID: "Payment verified",
  AI_PROCESSING: "Work in progress", DRAFT_GENERATED: "Work in progress", UNDER_ADVOCATE_REVIEW: "Under advocate review",
  USER_RESPONSE_REQUIRED: "Your response needed", APPROVED: "Finalising your document", COMPLETED: "Completed",
};
export const progressNote: Record<MatterStatus, string> = {
  DRAFT: "Tell us what happened to get started.",
  INTAKE_IN_PROGRESS: "Add your details and documents, then confirm your facts.",
  READY_FOR_PAYMENT: "Your facts are confirmed. Pay the fee to start the work.",
  PAYMENT_VERIFICATION: "We are verifying your payment. This updates as soon as it is confirmed.",
  PAID: "Payment verified. Our team is working on your document. It usually takes 24 hours or less.",
  AI_PROCESSING: "Payment verified. Our team is working on your document. It usually takes 24 hours or less.",
  DRAFT_GENERATED: "Payment verified. Our team is working on your document. It usually takes 24 hours or less.",
  UNDER_ADVOCATE_REVIEW: "Our in-house advocate is reviewing your document.",
  USER_RESPONSE_REQUIRED: "Our advocate needs a little more information from you. Please answer below.",
  APPROVED: "Approved. We are preparing your final PDF.",
  COMPLETED: "Your document is ready to download.",
};
export const progressStage: Record<MatterStatus, number> = {
  DRAFT: 0, INTAKE_IN_PROGRESS: 0, READY_FOR_PAYMENT: 1, PAYMENT_VERIFICATION: 1, PAID: 2, AI_PROCESSING: 2,
  DRAFT_GENERATED: 2, UNDER_ADVOCATE_REVIEW: 3, USER_RESPONSE_REQUIRED: 3, APPROVED: 4, COMPLETED: 5,
};

export type Overview = {
  matter: Matter;
  intake: Intake | null;
  evidence: EvidenceItem[];
  review: MatterReview | null;
  document: MatterDocument;
  advocateRequests: AdvocateRequests | null;
  finalDocument: FinalDocument;
  authorities: PublicAuthority[];
  rtiDetails: RtiDetail | null;
};
