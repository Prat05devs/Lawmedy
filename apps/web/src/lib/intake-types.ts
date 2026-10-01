export type Intake = {
  status: "NOT_STARTED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  message?: string;
  allAnswered?: boolean;
  analysis: null | {
    id: string;
    statementId: string;
    category: string;
    summary: string;
    facts: { key: string; value: string; sourceQuote: string }[];
    missingInformation: { field: string; question: string }[];
    questions: {
      id: string;
      question: string;
      answer: null | { answer: string };
    }[];
  };
};
