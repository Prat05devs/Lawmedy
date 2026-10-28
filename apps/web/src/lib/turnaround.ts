// The delivery promise: the document is ready within 24 hours of verified payment.
export const PROMISE_HOURS = 24;

const when = (d: Date) =>
  d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function duration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

// What the customer sees once the PDF is ready, measured against the promise.
export function deliveredLine(paidAt: string | null | undefined, deliveredAt: string) {
  if (!paidAt) return null;
  const ms = new Date(deliveredAt).getTime() - new Date(paidAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const within = ms <= PROMISE_HOURS * 3600000;
  return {
    within,
    text: within
      ? `Delivered in ${duration(ms)} after your payment was confirmed, within our ${PROMISE_HOURS}-hour promise.`
      : `Delivered in ${duration(ms)} after your payment was confirmed. That is longer than our ${PROMISE_HOURS}-hour promise, and we’re sorry for the wait.`,
  };
}

// While the document is being prepared: when it is due.
export function expectedLine(paidAt: string | null | undefined) {
  if (!paidAt) return null;
  const due = new Date(new Date(paidAt).getTime() + PROMISE_HOURS * 3600000);
  return due.getTime() > Date.now()
    ? `Expected by ${when(due)}, within ${PROMISE_HOURS} hours of your payment.`
    : `Due by ${when(due)}. It is taking longer than usual; our team has been alerted.`;
}
