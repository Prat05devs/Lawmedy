"use client";
import { useActionState } from "react";
import { BadgeCheck, CircleAlert, ExternalLink, Hourglass, LoaderCircle, ShieldCheck } from "lucide-react";
import { submitManualPayment } from "@/lib/actions";
import type { MatterReview } from "@/lib/api";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const money = (paise: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(paise / 100);

export function ManualPaymentPanel({ matterId, review }: { matterId: string; review: MatterReview }) {
  const [state, action, pending] = useActionState(submitManualPayment.bind(null, matterId), {});
  const amount = money(review.pricing.amount, review.pricing.currency);
  const label = review.matterType === "RTI" ? "RTI application" : "Legal notice";

  if (review.status === "PAID") {
    return (
      <section className="panel payment-panel">
        <div className="panel-heading">
          <span className="step-number">05</span>
          <div><h2>Payment verified</h2><p className="muted small">Thank you. Your {label.toLowerCase()} is now in progress.</p></div>
        </div>
        <div className="message success"><BadgeCheck size={18} /> Payment of {amount} confirmed. Our team is working on your document and it usually takes 24 hours or less.</div>
      </section>
    );
  }

  if (review.status === "PAYMENT_VERIFICATION") {
    return (
      <section className="panel payment-panel">
        <div className="panel-heading">
          <span className="step-number">05</span>
          <div><h2>Payment under verification</h2><p className="muted small">We are matching your payment. This page updates once it is confirmed.</p></div>
        </div>
        <div className="verify-card">
          <Hourglass size={22} />
          <div>
            <strong>Reference {review.payment?.providerPaymentId}</strong>
            <p className="muted small">
              {review.payment?.submittedAt ? `Submitted ${date(review.payment.submittedAt)}. ` : ""}
              You do not need to do anything else. We will notify you as soon as your payment is verified, and your document work starts right after.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const rejected = review.payment?.status === "REJECTED";
  return (
    <section className="panel payment-panel">
      <div className="panel-heading">
        <span className="step-number">05</span>
        <div><h2>Pay the fee</h2><p className="muted small">Two quick steps. We verify every payment by hand.</p></div>
      </div>
      <div className="price-row"><span>{label} drafting and review</span><strong>{amount}</strong></div>

      {rejected && (
        <div className="message error" role="alert">
          <CircleAlert size={18} /> We could not verify your last payment. {review.payment?.reviewNote} Please pay and submit the reference again.
        </div>
      )}

      <ol className="pay-steps">
        <li>
          <span>1</span>
          <div>
            <strong>Pay {amount} on our secure payment page</strong>
            <p className="muted small">On the page that opens, enter exactly <b>{(review.pricing.amount / 100).toString()}</b> as the amount and complete the payment.</p>
            <a className="button gold" href={review.paymentLink} target="_blank" rel="noopener noreferrer">
              Open payment page <ExternalLink size={16} />
            </a>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Enter your payment reference</strong>
            <p className="muted small">After paying you get a payment ID or UTR / transaction number. Enter it so we can match your payment.</p>
            <form action={action} className="form-stack">
              <label>Payment reference<input name="reference" required minLength={6} maxLength={64} placeholder="e.g. pay_Abc123 or UTR number" autoComplete="off" /></label>
              <button className="button primary" disabled={pending}>
                {pending ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}
                {pending ? "Submitting…" : "I have paid, submit reference"}
              </button>
              {state.error && <p className="message error" role="alert">{state.error}</p>}
            </form>
          </div>
        </li>
      </ol>
      <p className="field-note payment-note">Your document work starts only after we verify the payment. A wrong amount or reference cannot be matched.</p>
    </section>
  );
}
