import type { Matter } from "./api";

export type NoticeContent = {
  status: "READY";
  missingInformation?: string[];
  sender: { name: string; address: string | null };
  recipient: { name: string; address: string | null };
  subject: string;
  paragraphs: Array<{ text: string; caseFactIds: string[] }>;
  demand: string;
  responsePeriod: string;
};

export type RtiContent = {
  status: "READY";
  applicant: { name: string; address?: string | null; phone?: string | null };
  publicAuthority: { name: string; department: string; address: string };
  subject: string;
  period: { from: string | null; to: string | null } | null;
  informationRequests: Array<{ text: string; caseFactIds: string[] }>;
};

export type AdvocateAssignment = {
  id: string;
  status: "PENDING" | "WAITING_FOR_USER" | "COMPLETED";
  newInformation: boolean;
  assignedAt: string;
  matter: Matter & {
    user: { fullName: string; email: string };
    documents: Array<{ currentVersion: number }>;
  };
};

export type AdvocateMatterDetail = {
  id: string;
  status: AdvocateAssignment["status"];
  newInformation: boolean;
  assignedAt: string;
  matter: Matter & {
    user: { fullName: string; email: string };
    caseFacts: Array<{
      id: string;
      type: string;
      value: { text?: string; sourceLabel?: string };
      source: string;
    }>;
    applicantAddress: string | null;
    applicantPhone: string | null;
    rtiDetail: null | {
      subject: string;
      department: string;
      governmentLevel: string;
      state: string | null;
      periodFrom: string | null;
      periodTo: string | null;
      publicAuthority: { name: string; address: string };
    };
    recipient: null | {
      name: string;
      address: string;
      phone: string | null;
      email: string | null;
    };
    evidence: Array<{
      id: string;
      originalFilename: string;
      mimeType: string;
      status: string;
      extraction: null | {
        extraction: { summary?: string; documentType?: string };
      };
    }>;
    documents: Array<{
      id: string;
      currentVersion: number;
      reviewedAt: string | null;
      versions: Array<{
        id: string;
        versionNumber: number;
        createdByType: "AI" | "ADVOCATE";
        createdAt: string;
        content: NoticeContent | RtiContent;
        qa: null | {
          passed: boolean;
          issues: Array<{
            code: string;
            description: string;
            paragraphIndex: number | null;
          }>;
          warnings: string[];
        };
      }>;
    }>;
    questions: Array<{
      id: string;
      question: string;
      createdAt: string;
      requestedByAdvocate: null | { fullName: string };
      answer: null | { answer: string; updatedAt: string };
    }>;
  };
};
