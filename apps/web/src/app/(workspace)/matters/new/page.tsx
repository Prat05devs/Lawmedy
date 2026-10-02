import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { CreateMatterForm } from "@/components/forms";
export const metadata = { title: "New legal notice" };
export default function NewMatter() {
  return (
    <>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={16} /> All matters
      </Link>
      <div className="narrow">
        <div className="matter-banner">
          <Image src="/images/photos/lady-justice.jpg" alt="" fill sizes="800px" />
          <div><small>LEGAL NOTICE</small><h2>Say it properly, in writing</h2></div>
        </div>
        <p className="eyebrow">A NEW BEGINNING</p>
        <h1>Let’s start with your story.</h1>
        <p className="muted">Create a private matter for your legal notice.</p>
        <section className="panel new-matter">
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
          Gemini reads your statement and any documents you upload, then asks
          follow-up questions. Nothing is drafted until you confirm the facts.
          Need public records instead? <Link href="/matters/new/rti" className="text-link">File an RTI</Link>.
        </p>
      </div>
    </>
  );
}
