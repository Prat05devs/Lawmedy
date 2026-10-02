"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  confirmReview,
  createPaymentOrder,
  verifyPayment,
  prepareReview,
  type CheckoutDetails,
} from "@/lib/actions";
import type { MatterReview } from "@/lib/api";
import { ManualPaymentPanel } from "@/components/manual-payment";

type RazorpayInstance = { open(): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export function ReviewPanel({
  matterId,
  review,
}: {
  matterId: string;
  review: MatterReview;
}) {
  if (review.status === "DRAFT") return null;
  return (
    <>
      <FactReview matterId={matterId} review={review} />
      {(review.status === "READY_FOR_PAYMENT" || review.status === "PAYMENT_VERIFICATION" || review.status === "PAID") && (
        review.paymentMode === "manual" ? (
          <ManualPaymentPanel matterId={matterId} review={review} />
        ) : (
          <PaymentPanel matterId={matterId} review={review} />
        )
      )}
    </>
  );
}

function FactReview({
  matterId,
  review,
}: {
  matterId: string;
  review: MatterReview;
}) {
  const [prepareState, prepareAction, preparing] = useActionState(
    prepareReview.bind(null, matterId),
    {},
  );
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmReview.bind(null, matterId),
    {},
  );
  const locked = review.status !== "INTAKE_IN_PROGRESS";
  const confirmedFacts = review.factGroups.flatMap((group) =>
    group.values.filter((value) => value.confirmed),
  );

  return (
    <section className="panel review-panel">
      <div className="panel-heading">
        <span className="step-number">04</span>
        <div>
          <h2>Review the case information</h2>
          <p className="muted small">
            {review.matterType === "RTI" ? "Resolve any mismatches and confirm the information for your RTI." : "Resolve any mismatches and confirm who should receive the notice."}
          </p>
        </div>
      </div>
      {!review.prepared && !locked ? (
        <form action={prepareAction}>
          <p className="muted">
            We’ll bring together the facts from your current statement,
            follow-up answers, and processed evidence.
          </p>
          <button className="button outline" disabled={preparing}>
            {preparing ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            {preparing ? "Preparing…" : "Prepare facts for review"}
          </button>
          <ActionMessages state={prepareState} />
        </form>
      ) : locked ? (
        <div className="confirmed-review">
          <div className="message success">
            <CheckCircle2 size={18} /> You confirmed this information.
          </div>
          <ConfirmedFacts review={review} facts={confirmedFacts} />
        </div>
      ) : (
        <form action={confirmAction} className="review-form form-stack">
          {review.factGroups.length ? (
            <div className="fact-review-list">
              {review.factGroups.map((group) => (
                <fieldset
                  key={group.type}
                  className={group.conflict ? "fact-conflict" : "fact-agreed"}
                >
                  <legend>{label(group.type)}</legend>
                  {group.conflict && (
                    <p className="conflict-note">
                      <AlertTriangle size={15} /> We found different values.
                      Choose the correct one.
                    </p>
                  )}
                  {group.values.map((value) => (
                    <label key={value.id} className="fact-option">
                      {group.conflict && (
                        <input
                          type="radio"
                          name={`fact:${group.type}`}
                          value={value.id}
                          defaultChecked={value.id === group.selectedId}
                          required
                        />
                      )}
                      <span>
                        <strong>{value.value}</strong>
                        <small>
                          {sourceLabel(value.source)} · {value.sourceLabel}
                        </small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          ) : (
            <div className="message error">
              <AlertTriangle size={18} /> No structured facts are available yet.
              Your saved work is safe; retry AI analysis after Gemini is
              configured before confirming the case.
            </div>
          )}
          <ApplicantFields applicant={review.applicant} matterType={review.matterType} />
          {review.matterType === "LEGAL_NOTICE" && <RecipientFields recipient={review.recipient} />}
          <label className="confirm-check">
            <input type="checkbox" name="confirmed" required />
            <span>I confirm this information is accurate.</span>
          </label>
          <div className="review-actions">
            <button
              className="button primary"
              disabled={confirming || review.factGroups.length === 0}
            >
              {confirming && <LoaderCircle className="spin" size={17} />}
              {confirming ? "Confirming…" : "Confirm and continue"}
            </button>
            <button
              className="text-button"
              formAction={prepareAction}
              disabled={preparing}
            >
              <RefreshCw className={preparing ? "spin" : ""} size={14} />
              Refresh facts
            </button>
          </div>
          <ActionMessages state={confirmState} />
          <ActionMessages state={prepareState} />
        </form>
      )}
    </section>
  );
}

function ApplicantFields({
  applicant,
  matterType,
}: {
  applicant: MatterReview["applicant"];
  matterType: MatterReview["matterType"];
}) {
  return (
    <div className="recipient-fields">
      <h3>Your contact details</h3>
      <p className="muted small">
        {matterType === "RTI"
          ? "The public authority needs your postal address to send its reply."
          : "Your address appears in the sender block of the notice."}
      </p>
      <label>
        Your postal address
        <textarea name="applicantAddress" rows={3} minLength={10} maxLength={2000} required defaultValue={applicant?.address ?? ""} />
      </label>
      <label>
        Phone <span className="muted small">Optional</span>
        <input name="applicantPhone" type="tel" defaultValue={applicant?.phone ?? ""} />
      </label>
    </div>
  );
}

function RecipientFields({
  recipient,
}: {
  recipient: MatterReview["recipient"];
}) {
  return (
    <div className="recipient-fields">
      <h3>Recipient details</h3>
      <p className="muted small">
        Enter the person or organisation that should receive the notice.
      </p>
      <label>
        Recipient name
        <input
          name="recipientName"
          minLength={2}
          maxLength={200}
          required
          defaultValue={recipient?.name ?? ""}
        />
      </label>
      <label>
        Postal address
        <textarea
          name="recipientAddress"
          rows={3}
          minLength={5}
          maxLength={2000}
          required
          defaultValue={recipient?.address ?? ""}
        />
      </label>
      <div className="recipient-grid">
        <label>
          Phone <span className="muted small">Optional</span>
          <input
            name="recipientPhone"
            type="tel"
            defaultValue={recipient?.phone ?? ""}
          />
        </label>
        <label>
          Email <span className="muted small">Optional</span>
          <input
            name="recipientEmail"
            type="email"
            maxLength={254}
            defaultValue={recipient?.email ?? ""}
          />
        </label>
      </div>
    </div>
  );
}

function ConfirmedFacts({
  review,
  facts,
}: {
  review: MatterReview;
  facts: Array<MatterReview["factGroups"][number]["values"][number]>;
}) {
  return (
    <div className="confirmed-grid">
      <div>
        <h3>Confirmed facts</h3>
        {facts.map((fact) => (
          <p key={fact.id}>{fact.value}</p>
        ))}
      </div>
      {review.recipient && (
        <div>
          <h3>Recipient</h3>
          <p>{review.recipient.name}</p>
          <p className="pre-wrap">{review.recipient.address}</p>
        </div>
      )}
    </div>
  );
}

function PaymentPanel({
  matterId,
  review,
}: {
  matterId: string;
  review: MatterReview;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createPaymentOrder.bind(null, matterId),
    {},
  );
  const [clientError, setClientError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const openedOrder = useRef<string | null>(null);

  useEffect(() => {
    if (!state.checkout || openedOrder.current === state.checkout.orderId)
      return;
    openedOrder.current = state.checkout.orderId;
    void openCheckout(state.checkout, {
      success: (response) => {
        setWaiting(true);
        void verifyPayment(matterId, {
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }).then(() => router.refresh());
      },
      error: setClientError,
    });
  }, [router, state.checkout, matterId]);

  const paid = review.status === "PAID" || review.payment?.status === "PAID";
  return (
    <section className="panel payment-panel">
      <div className="panel-heading">
        <span className="step-number">05</span>
        <div>
          <h2>{paid ? "Payment received" : "Review fee"}</h2>
          <p className="muted small">
            {paid
              ? "Your payment was verified securely."
              : "Razorpay test checkout is used during development."}
          </p>
        </div>
      </div>
      {paid ? (
        <div className="message success">
          <CheckCircle2 size={18} /> Payment confirmed. Your matter is ready for
          the next stage.
        </div>
      ) : (
        <>
          <div className="price-row">
            <span>{review.matterType === "RTI" ? "RTI drafting" : "Legal notice review"}</span>
            <strong>
              {money(review.pricing.amount, review.pricing.currency)}
            </strong>
          </div>
          {review.paymentConfigured ? (
            <form action={action}>
              <button className="button primary" disabled={pending || waiting}>
                {pending || waiting ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <CreditCard size={17} />
                )}
                {pending
                  ? "Creating secure order…"
                  : waiting
                    ? "Waiting for verification…"
                    : "Pay securely with Razorpay"}
              </button>
            </form>
          ) : (
            <div className="message payment-pending">
              Payment setup is pending. Your confirmed information is saved and
              the app will remain available.
            </div>
          )}
          <p className="field-note payment-note">
            A browser success message never marks the matter paid. Lawmedy waits
            for Razorpay’s signed webhook.
          </p>
          {waiting && (
            <p className="message success" role="status">
              Payment submitted. Waiting for secure webhook confirmation…
            </p>
          )}
          {(state.error || clientError) && (
            <p className="message error" role="alert">
              {state.error || clientError}
            </p>
          )}
        </>
      )}
    </section>
  );
}

async function openCheckout(
  checkout: CheckoutDetails,
  callbacks: {
    success(response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): void;
    error(message: string): void;
  },
) {
  try {
    await loadRazorpay();
    if (!window.Razorpay) throw new Error("Checkout did not load.");
    const instance = new window.Razorpay({
      key: checkout.keyId,
      order_id: checkout.orderId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      theme: { color: "#486c55" },
      handler: callbacks.success,
      modal: { ondismiss: () => undefined },
    });
    instance.open();
  } catch {
    callbacks.error(
      "Secure checkout could not load. Check your connection and try again.",
    );
  }
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

function ActionMessages({
  state,
}: {
  state: { error?: string; success?: string };
}) {
  return (
    <>
      {state.error && <p className="message error">{state.error}</p>}
      {state.success && <p className="message success">{state.success}</p>}
    </>
  );
}

function label(value: string) {
  return value.replace(":", " – ").replaceAll("_", " ");
}
function sourceLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}
