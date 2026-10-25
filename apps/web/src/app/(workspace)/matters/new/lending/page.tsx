import Link from "next/link";
import { CreateMatterForm } from "@/components/forms";
import { api } from "@/lib/api";

export const metadata = { title: "Lending certificate" };
export default async function NewLendingCertificate() {
  const pricing = await api<{ currency: string; lendingCertificate: number }>("/public/pricing");
  const price = pricing ? new Intl.NumberFormat("en-IN", { style: "currency", currency: pricing.currency, maximumFractionDigits: 0 }).format(pricing.lendingCertificate / 100) : null;
  return <div className="narrow">
    <Link href="/dashboard" className="back-link">All matters</Link>
    <h1>Record money you have lent</h1>
    <p className="muted">A lending certificate on our in-house advocate’s letterhead, with their signature and stamp.</p>
    <section className="panel form-stack">
      <h2>{price ? `${price} · Lending certificate` : "Lending certificate"}</h2>
      <p>Tell us who paid whom, the amount, transfer date and method, and any repayment terms. Add the payment receipt or other supporting records.</p>
      <p>Our advocate reviews your facts and prepares your signed and stamped PDF within 24 hours after verified payment and complete information.</p>
      <p className="field-note">This records the information and supporting documents you provide. It is not an affidavit or notarised document.</p>
      <CreateMatterForm type="LENDING_CERTIFICATE" />
    </section>
  </div>;
}
