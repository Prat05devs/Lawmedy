import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { Matter } from "@/lib/api";

const steps = ["Your details", "Payment", "In progress", "Advocate review", "Ready"];
const stage: Record<Matter["status"], number> = {
  DRAFT: 0, INTAKE_IN_PROGRESS: 0, READY_FOR_PAYMENT: 1, PAYMENT_VERIFICATION: 1,
  PAID: 2, AI_PROCESSING: 2, DRAFT_GENERATED: 2, UNDER_ADVOCATE_REVIEW: 3, USER_RESPONSE_REQUIRED: 3, APPROVED: 4, COMPLETED: 5,
};
const note: Record<Matter["status"], string> = {
  DRAFT: "Tell us what happened to get started.",
  INTAKE_IN_PROGRESS: "Add your details and documents, then confirm your facts.",
  READY_FOR_PAYMENT: "Your facts are confirmed. Pay the fee to start the work.",
  PAYMENT_VERIFICATION: "We are verifying your payment. This page updates as soon as it is confirmed.",
  PAID: "Payment verified. Our team is working on your document. It usually takes 24 hours or less.",
  AI_PROCESSING: "Payment verified. Our team is working on your document. It usually takes 24 hours or less.",
  DRAFT_GENERATED: "Payment verified. Our team is working on your document. It usually takes 24 hours or less.",
  UNDER_ADVOCATE_REVIEW: "Our in-house advocate is reviewing your document.",
  USER_RESPONSE_REQUIRED: "Our advocate needs a little more information from you. Please answer below.",
  APPROVED: "Approved. We are preparing your final PDF.",
  COMPLETED: "Your document is ready to download.",
};

export function ProgressTracker({ status }: { status: Matter["status"] }) {
  const current = stage[status];
  return (
    <div className="tracker" aria-label="Progress">
      <ol>
        {steps.map((name, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={name} className={done ? "done" : active ? "active" : ""}>
              {done ? <CheckCircle2 size={18} /> : active ? <Clock3 size={18} /> : <Circle size={18} />}
              <span>{name}</span>
            </li>
          );
        })}
      </ol>
      <p>{note[status]}</p>
    </div>
  );
}
