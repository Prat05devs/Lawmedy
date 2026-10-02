import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CircleCheck,
  ClipboardCheck,
  FileDown,
  FileSearch,
  Gavel,
  Landmark,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { LandingNav } from "@/components/landing-nav";
import "./landing.css";

const services = [
  {
    Icon: Gavel,
    title: "Legal notice drafting",
    text: "Describe an unpaid loan, an unreturned deposit, a refund that never came, a broken agreement, or a consumer or property dispute. We draft a complete notice in a fixed format: facts, default, legal basis, demand and deadline.",
  },
  {
    Icon: Landmark,
    title: "RTI applications",
    text: "Tell us what you want to know from a public authority. We prepare a Section 6(1) application addressed to the right office, with one precise request for each record and the standard fee, BPL and timeline statements.",
  },
  {
    Icon: FileSearch,
    title: "Document reading",
    text: "Upload agreements, receipts, bank transfers and screenshots. Every file is read for names, amounts and dates, and used to ground the draft in your paper trail.",
  },
  {
    Icon: ClipboardCheck,
    title: "Fact confirmation",
    text: "You see each fact next to its source, resolve any disagreement between your account and your documents, and confirm. Only confirmed facts reach the draft.",
  },
  {
    Icon: BadgeCheck,
    title: "In-house advocate review",
    text: "Every legal notice and every RTI application is reviewed by our in-house advocate, who can edit the draft, ask you for more information, and approve it before it reaches you.",
  },
  {
    Icon: FileDown,
    title: "Tracking and secure delivery",
    text: "Follow your matter from your dashboard, get notified when something needs you, and download the approved PDF through a private link that expires within minutes.",
  },
];

const advocateSteps = [
  { Icon: UserPlus, title: "Enrol", text: "Advocates will be able to enrol themselves on the portal and set up their own workspace." },
  { Icon: Gavel, title: "Review legal notices", text: "Legal notice reviews are assigned to enrolled advocates, with the full file in front of them: the client's statement, confirmed facts, evidence and the draft." },
  { Icon: Briefcase, title: "Take the case further", text: "Once a notice has gone out, advocates can carry the matter forward as their own case, with the client already on the platform." },
];

const steps = [
  {
    n: "01",
    img: "writing",
    title: "Tell us what happened",
    text: "Write it the way you would tell a friend. We pull out the who, what, when and how much, and ask only the follow-up questions that are genuinely missing.",
  },
  {
    n: "02",
    img: "handshake",
    title: "Add what you already have",
    text: "Agreements, receipts, bank transfers, chat screenshots, earlier letters. They are read for exact figures and dates, so the draft rests on your paper trail rather than on memory.",
  },
  {
    n: "03",
    img: "gavel-book",
    title: "Confirm every fact",
    text: "Each date, amount and name is shown with its source. If your account and a document disagree, you decide which is right. Nothing you have not confirmed enters the draft.",
  },
  {
    n: "04",
    img: "signing",
    title: "Reviewed, then yours",
    text: "The draft is fitted into a fixed legal format. Our in-house advocate reviews it, edits where needed and can ask you questions. Once approved, you download the finished PDF.",
  },
];

const anatomy = [
  { label: "Letterhead & reference", who: "template", note: "Same every time" },
  { label: "From / To", who: "records", note: "Filled from your confirmed details, never written by AI" },
  { label: "Subject", who: "ai", note: "One line, drawn from your facts" },
  { label: "Facts", who: "ai", note: "Chronological, every paragraph tied to a confirmed fact" },
  { label: "Your default", who: "ai", note: "What the other side failed to do" },
  { label: "Legal basis", who: "vetted", note: "Chosen from a vetted list, never invented" },
  { label: "Demand & deadline", who: "ai", note: "Clear action with a 7 to 60 day window" },
  { label: "Closing notice", who: "template", note: "Fixed legal wording" },
  { label: "Advocate sign-off", who: "human", note: "Reviewed by our in-house advocate before it reaches you" },
] as const;

const whoLabel = { template: "Fixed template", records: "Your records", ai: "Drafted by AI", vetted: "Vetted list", human: "Human advocate" };

const principles = [
  { Icon: FileSearch, title: "Evidence first", text: "Your documents are read alongside your account, so the figures and dates in the draft come from paper, not from guesswork." },
  { Icon: ScrollText, title: "A fixed format", text: "The AI fills defined sections. It does not choose the layout, the parties, the statute references or the closing language." },
  { Icon: ShieldCheck, title: "Nothing invented", text: "Every paragraph must point to a fact you confirmed. A second automated check rejects drafts with unsupported claims." },
  { Icon: UserCheck, title: "A human in the loop", text: "Every legal notice and RTI application is reviewed and approved by our in-house advocate, who can edit the draft or ask you for more detail." },
  { Icon: LockKeyhole, title: "Private by default", text: "Files are never public. Downloads use signed links that expire within minutes." },
];

const faqs = [
  { q: "Is this legal advice?", a: "No. Lawmedy prepares documents, and our in-house advocate reviews each one before you receive it. A complex or high-value dispute still deserves a proper consultation." },
  { q: "Is every document reviewed by an advocate?", a: "Yes. Both legal notices and RTI applications are reviewed and approved by our in-house advocate before the final PDF is released to you." },
  { q: "Do I need documents to start?", a: "No. You can begin with your account of events alone. Documents are optional, but they make the draft more precise and let us check your facts against paper." },
  { q: "Who can see my files?", a: "Only you and the advocate reviewing your matter. Files are stored privately and are never given a public link." },
  { q: "What if my statement and a document disagree?", a: "We show you both values with their sources and you pick the correct one. The draft is built only from what you confirm." },
  { q: "Can advocates join Lawmedy?", a: "Soon. We are building an advocate portal where advocates can enrol themselves, take on legal notice reviews, and carry matters forward as their own cases. Today, reviews are handled by our in-house advocate." },
];

export default async function Home() {
  if ((await cookies()).get("lawmedy_session")) redirect("/dashboard");
  return (
    <div className="lp">
      <LandingNav />

      <section className="lp-section lp-hero" id="top">
        <Image src="/images/photos/courthouse.jpg" alt="" fill priority sizes="100vw" className="lp-cover" />
        <div className="lp-hero-shade" />
        <div className="lp-wrap lp-hero-inner">
          <p className="lp-eyebrow gold">LEGAL NOTICES &amp; RTI APPLICATIONS</p>
          <h1>Say it in writing.<br />Say it right.</h1>
          <p className="lp-lede">
            Most disputes begin with a letter someone should have sent. Lawmedy turns what happened,
            and the documents you already have, into a legal notice or RTI application that is
            properly formatted, checked against your facts, and reviewed by our in-house advocate before it reaches you.
          </p>
          <div className="lp-actions">
            <Link href="/signup" className="button gold large">Start a legal notice <ArrowRight size={18} /></Link>
            <Link href="/signup" className="button glass large">File an RTI</Link>
          </div>
          <ul className="lp-chips">
            <li><BadgeCheck size={16} /> Reviewed by our in-house advocate</li>
            <li><FileSearch size={16} /> Reads your supporting documents</li>
            <li><LockKeyhole size={16} /> Private by design</li>
          </ul>
        </div>
        <a href="#idea" className="lp-scroll" aria-label="Scroll to the next section"><span /></a>
      </section>

      <section className="lp-section lp-idea" id="idea">
        <div className="lp-wrap lp-split">
          <div className="lp-photo reveal">
            <Image src="/images/photos/handshake.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 45vw" />
            <div className="lp-photo-tag"><Gavel size={16} /> The first letter often decides what happens next</div>
          </div>
          <div className="lp-copy reveal">
            <p className="lp-eyebrow">WHY LAWMEDY EXISTS</p>
            <h2>The first letter matters more than most people realise.</h2>
            <p>
              A legal notice is often the step that settles a dispute: an unpaid loan, a refund that never came,
              a deposit never returned. An RTI application is how you ask a government office what it actually did.
              Both only work when they are precise, with the right facts, the right format and the right tone.
            </p>
            <p>
              Most people either do not know where to begin or pay for a short letter and wait days. Chat-style AI
              is quick, but it will happily invent a date, an amount or a section of law, and in a legal document
              that is dangerous.
            </p>
            <div className="lp-answer">
              <strong>Our answer is a division of labour.</strong>
              <span>AI does the slow part: structuring and drafting. It never supplies the facts. You confirm the facts, and our in-house advocate confirms the document.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-services" id="services">
        <div className="lp-wrap">
          <div className="lp-head reveal">
            <p className="lp-eyebrow">OUR SERVICES</p>
            <h2>Everything between “this happened” and “here is the document.”</h2>
            <p>Lawmedy is a complete service, not just a drafting tool. Here is what you get, from your first sentence to the finished PDF.</p>
          </div>
          <div className="lp-service-grid">
            {services.map(({ Icon, title, text }) => (
              <article className="lp-service reveal" key={title}>
                <span><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-how" id="how">
        <div className="lp-wrap">
          <div className="lp-head reveal">
            <p className="lp-eyebrow">HOW IT WORKS</p>
            <h2>From “this is what happened” to a document you can send.</h2>
            <p>Four steps. You stay in control of the facts at every one of them.</p>
          </div>
          <div className="lp-steps">
            {steps.map((step) => (
              <article className="lp-step reveal" key={step.n}>
                <div className="lp-step-photo">
                  <Image src={`/images/photos/${step.img}.jpg`} alt="" fill sizes="(max-width: 900px) 100vw, 25vw" />
                  <span>{step.n}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-docs" id="documents">
        <div className="lp-wrap">
          <div className="lp-head reveal">
            <p className="lp-eyebrow gold">WHAT YOU CAN CREATE</p>
            <h2>Two documents. One careful process.</h2>
          </div>
          <div className="lp-doc-grid">
            <article className="lp-doc reveal">
              <Image src="/images/photos/lady-justice.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="lp-doc-shade" />
              <div className="lp-doc-body">
                <Gavel size={28} />
                <h3>Legal notice</h3>
                <p>For money owed, refunds, deposits, broken agreements, consumer complaints and property disputes.</p>
                <ul>
                  <li><CircleCheck size={16} /> Facts set out in order</li>
                  <li><CircleCheck size={16} /> Where the other side defaulted</li>
                  <li><CircleCheck size={16} /> Legal basis from a vetted list</li>
                  <li><CircleCheck size={16} /> A clear demand with a deadline</li>
                  <li><CircleCheck size={16} /> Reviewed and approved by our in-house advocate</li>
                </ul>
                <Link href="/signup" className="button gold">Start a legal notice <ArrowRight size={16} /></Link>
              </div>
            </article>
            <article className="lp-doc reveal">
              <Image src="/images/photos/rashtrapati.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="lp-doc-shade" />
              <div className="lp-doc-body">
                <Landmark size={28} />
                <h3>RTI application</h3>
                <p>For anyone who wants records and decisions from a public authority under the Right to Information Act.</p>
                <ul>
                  <li><CircleCheck size={16} /> Section 6(1) application, correctly addressed</li>
                  <li><CircleCheck size={16} /> Each request names an identifiable record</li>
                  <li><CircleCheck size={16} /> Fee, BPL and timeline statements included</li>
                  <li><CircleCheck size={16} /> Your address, so the reply reaches you</li>
                  <li><CircleCheck size={16} /> Reviewed and approved by our in-house advocate</li>
                </ul>
                <Link href="/signup" className="button gold">File an RTI <ArrowRight size={16} /></Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-section lp-hood" id="under-the-hood">
        <div className="lp-wrap">
          <div className="lp-head reveal">
            <p className="lp-eyebrow">UNDER THE HOOD</p>
            <h2>A document built like a document, not a chat reply.</h2>
            <p>
              The most important design decision is what the AI is <em>not</em> allowed to do.
              Here is a legal notice, section by section, and who is responsible for each part.
            </p>
          </div>
          <div className="lp-hood-grid">
            <div className="lp-paper reveal" aria-label="Anatomy of a Lawmedy legal notice">
              {anatomy.map((row, index) => (
                <div className={`lp-row who-${row.who}`} key={row.label}>
                  <span className="lp-row-n">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.note}</small>
                  </div>
                  <em>{whoLabel[row.who]}</em>
                </div>
              ))}
            </div>
            <div className="lp-principles reveal">
              {principles.map(({ Icon, title, text }) => (
                <div className="lp-principle" key={title}>
                  <span><Icon size={20} /></span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-advocates" id="advocates">
        <Image src="/images/photos/gavel-dark.jpg" alt="" fill sizes="100vw" className="lp-cover" />
        <div className="lp-adv-shade" />
        <div className="lp-wrap lp-adv-inner">
          <div className="lp-head reveal">
            <span className="lp-soon"><i /> COMING SOON</span>
            <p className="lp-eyebrow gold">FOR ADVOCATES</p>
            <h2>Soon, advocates can join Lawmedy.</h2>
            <p>
              Today, every document is reviewed by our in-house advocate. We are building an advocate portal so that
              more advocates can take part: enrol yourself, take on legal notice reviews, and carry the matter forward
              as your own case once the notice has been sent.
            </p>
          </div>
          <div className="lp-adv-grid">
            {advocateSteps.map(({ Icon, title, text }, index) => (
              <article className="lp-adv-card reveal" key={title}>
                <div><Icon size={22} /><b>{String(index + 1).padStart(2, "0")}</b></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="lp-adv-note reveal">
            Not live yet. Until it launches, legal notice and RTI reviews are handled by our in-house advocate.
          </p>
        </div>
      </section>

      <section className="lp-section lp-faq" id="faq">
        <div className="lp-wrap lp-split">
          <div className="lp-photo tall reveal">
            <Image src="/images/photos/law-library.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 40vw" />
          </div>
          <div className="lp-copy reveal">
            <p className="lp-eyebrow">QUESTIONS</p>
            <h2>Straight answers.</h2>
            <div className="lp-faq-list">
              {faqs.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-final">
        <Image src="/images/photos/india-gate.jpg" alt="" fill sizes="100vw" className="lp-cover" />
        <div className="lp-final-shade" />
        <div className="lp-wrap lp-final-inner">
          <h2>Do not let it drift.<br />Put it in writing.</h2>
          <p>Create a free account, tell us what happened, and have a properly drafted document in front of you.</p>
          <div className="lp-actions center">
            <Link href="/signup" className="button gold large">Create your account <ArrowRight size={18} /></Link>
            <Link href="/login" className="button glass large">I already have one</Link>
          </div>
        </div>
        <footer className="lp-footer">
          <Brand href="/" />
          <nav aria-label="Footer">
            <a href="#services">Services</a>
            <a href="#how">How it works</a>
            <a href="#documents">Documents</a>
            <a href="#under-the-hood">Under the hood</a>
            <a href="#advocates">For advocates</a>
            <a href="#faq">FAQ</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/delete-account">Delete account</Link>
          </nav>
          <p>
            Lawmedy helps you prepare documents. Every legal notice and RTI application is reviewed by our in-house advocate before delivery. Lawmedy is not a substitute for legal advice on complex disputes.
            Photography from Unsplash.
          </p>
          <span>© {new Date().getFullYear()} Lawmedy</span>
        </footer>
      </section>
    </div>
  );
}
