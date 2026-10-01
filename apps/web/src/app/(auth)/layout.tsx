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
        <Brand />
        <div className="auth-story-body">
          <p className="eyebrow">YOUR STORY. A CLEARER START.</p>
          <h1>
            A little clarity.
            <br />A way forward.
          </h1>
          <p>
            When something isn’t right, knowing where to begin makes all the
            difference.
          </p>
          <div className="story-card">
            <PenLine size={24} />
            <h3>Start with your story</h3>
            <p>
              Describe what happened, save your progress, and keep your matter
              in one place.
            </p>
            <div className="story-line" />
            <div className="story-line short" />
          </div>
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
