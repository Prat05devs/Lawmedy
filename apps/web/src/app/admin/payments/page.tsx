import Link from "next/link";
import { api, date } from "@/lib/api";
import { PaymentActions } from "@/components/admin-forms";

type Pending = { id: string; matterId: string; providerPaymentId: string; amount: number; currency: string; submittedAt: string;
  matter: { referenceNumber: string; type: string; user: { fullName: string; email: string } } };
const money = (p: number, c: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(p / 100);

export default async function AdminPayments() {
  const pending = await api<Pending[]>("/admin/payments");
  return (
    <>
      <div className="page-heading"><div><h1>Payments to verify</h1>
        <p className="muted">Open the payment dashboard, find the reference below, and confirm the amount matches before you verify.</p></div></div>
      {pending.length === 0 && <section className="panel"><p className="muted">Nothing waiting. New payment submissions appear here.</p></section>}
      {pending.map((p) => (
        <section key={p.id} className="panel">
          <div className="admin-pay-head">
            <div><strong>{p.matter.referenceNumber}</strong><small>{p.matter.type === "RTI" ? "RTI application" : "Legal notice"} · submitted {date(p.submittedAt)}</small></div>
            <div><strong>{p.matter.user.fullName}</strong><small>{p.matter.user.email}</small></div>
            <div className="admin-amount"><small>Expected amount</small><strong>{money(p.amount, p.currency)}</strong></div>
            <div className="admin-amount"><small>User's reference</small><strong className="mono">{p.providerPaymentId}</strong></div>
          </div>
          <PaymentActions paymentId={p.id} matterId={p.matterId} amount={money(p.amount, p.currency)} reference={p.providerPaymentId} />
          <Link href={`/admin/matters/${p.matterId}`} className="admin-link">View the full matter →</Link>
        </section>
      ))}
    </>
  );
}
