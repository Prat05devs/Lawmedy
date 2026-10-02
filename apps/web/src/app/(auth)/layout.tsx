import Image from "next/image";
import { Brand } from "@/components/brand";
import { FileText, LockKeyhole, PenLine } from "lucide-react";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Image src="/images/photos/gavel-dark.jpg" alt="" fill priority sizes="55vw" className="auth-photo" />
        <Brand href="/" />
        <div className="auth-story-body">
          <p className="eyebrow">LEGAL NOTICES &amp; RTI, DONE RIGHT</p>
          <h1>
            Put it in writing.
            <br />Properly.
          </h1>
          <p>
            Describe the problem, share your documents, and let an advocate sign
            off on the document before it reaches you.
          </p>
          <div className="auth-benefits">
            <span>
              <LockKeyhole size={16} /> Private by design
            </span>
            <span>
              <FileText size={16} /> Made for your matters
            </span>
          </div>
        </div>
        <p className="auth-foot">A simpler beginning for your legal matters.</p>
      </section>
      <section className="auth-form-area">{children}</section>
    </main>
  );
}
