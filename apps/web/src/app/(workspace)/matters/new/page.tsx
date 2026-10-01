import Link from "next/link";
import { ArrowLeft, FileText, LockKeyhole } from "lucide-react";
import { CreateMatterForm } from "@/components/forms";
export const metadata = { title: "New legal notice" };
export default function NewMatter() {
  return (
    <>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={16} /> All matters
      </Link>
      <div className="narrow">
        <p className="eyebrow">A NEW BEGINNING</p>
        <h1>Let’s start with your story.</h1>
        <p className="muted">Create a private matter for your legal notice.</p>
        <section className="panel new-matter">
          <span className="large-icon">
            <FileText size={30} />
          </span>
          <h2>Legal notice</h2>
          <p>
            Give your situation a place of its own. Once you create a matter,
            you can describe what happened and save your statement.
          </p>
          <ol className="steps">
            <li>
              <span>01</span>Create your matter
            </li>
            <li>
              <span>02</span>Describe your situation
            </li>
            <li>
              <span>03</span>Save and return anytime
            </li>
          </ol>
          <CreateMatterForm />
          <p className="secure-note">
            <LockKeyhole size={14} /> Only you can access this matter.
          </p>
        </section>
        <p className="small muted">
          Gemini will help understand your statement and ask follow-up
          questions. This does not generate or send a legal notice.
        </p>
      </div>
    </>
  );
}
