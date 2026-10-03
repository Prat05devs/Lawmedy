import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LandingNav } from "@/components/landing-nav";
import { SampleNotice } from "@/components/sample-notice";
import { site } from "@/lib/site";
import "./landing.css";

const steps = [
  { title: "You describe the problem", text: "A few plain sentences are enough. We read what you wrote and ask only for what is missing." },
  { title: "You add what you already have", text: "Agreements, receipts, bank transfers, screenshots. PDF or image, up to 10 MB each. We read them for names, amounts and dates." },
  { title: "You confirm every fact", text: "Each date and amount is shown next to where it came from. If your account and a document disagree, you pick the right one." },
  { title: "You pay and send us the reference", text: "Pay on our payment page, then enter the payment reference. We check it by hand, and your matter shows “Payment verified”." },
  { title: "We draft, an advocate reviews, you download", text: "The draft is written only from the facts you confirmed. The advocate edits it, may ask you a question, then approves it. The PDF is usually ready within 24 hours of verified payment." },
];

const aiRows = [
  ["Reading your statement and uploaded files", "AI"],
  ["Writing the subject, the facts and the demand", "AI, from facts you confirmed"],
  ["Checking the draft against those facts", "A second AI pass"],
  ["Names and addresses", "Copied from what you entered"],
  ["Legal provisions cited", "Chosen from a short list we vetted"],
  ["Closing wording and layout", "Fixed template"],
  ["Final approval", "An advocate"],
];

const faqs = [
  { q: "Is this legal advice?", a: "No. Lawmedy prepares documents and an advocate reviews each one. For a large or complicated dispute, speak to an advocate before you send anything." },
  { q: "Do I need documents to start?", a: "No. You can begin with your own account. Documents make the draft more exact and let us check your facts against paper." },
  { q: "Do you send the notice or the RTI application for me?", a: "No. You get a PDF and you send it. For an RTI application, the government fee is paid by you directly to the authority." },
  { q: "Who can see my files?", a: "You, and the advocate working on your matter. Files are stored privately and opened only through links that expire within minutes." },
  { q: "What if my account and a document disagree?", a: "We show you both with their sources and you choose. The draft uses only what you confirm." },
  { q: "Can I delete my data?", a: "Yes. In the app, open Account and choose Delete my account. Your matters, uploads and drafts are erased." },
];

export default async function Home() {
  if ((await cookies()).get("lawmedy_session")) redirect("/dashboard");
  return (
    <div className="lp">
      <LandingNav />

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <h1>Legal notices and RTI applications, written from your facts and reviewed by an advocate.</h1>
          <p>
            Tell us what happened and upload what you have. You confirm each fact. Our advocate reviews
            the draft, and you download a PDF you can send.
          </p>
          <p className="lp-price">{site.priceLabel} per document. Usually ready within 24 hours of verified payment.</p>
          <div className="lp-actions">
            <Link href="/signup" className="button primary large">Start a legal notice</Link>
            <Link href="/signup" className="lp-textlink">File an RTI application</Link>
          </div>
        </div>
        <SampleNotice />
      </section>

      <section className="lp-block" id="how">
        <h2>What happens after you start</h2>
        <ol className="lp-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="lp-num">{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-block lp-docs" id="documents">
        <div>
          <h2>A legal notice</h2>
          <p>For money someone owes you, a deposit or refund not returned, a broken agreement, or a consumer or property dispute. It sets out what happened in order, where the other side defaulted, what you want, and by when.</p>
          <p className="lp-note">You send it yourself, by post or courier. We do not deliver it.</p>
        </div>
        <div>
          <h2>An RTI application</h2>
          <p>A Section 6(1) application to a central, state or local public authority. You choose the authority and the period. Each request asks for one record that exists, such as a file noting, an order or a sanction letter.</p>
          <p className="lp-note">You file it and pay the government’s application fee directly to the authority.</p>
        </div>
      </section>

      <section className="lp-block" id="ai">
        <h2>Where AI is used, and where it is not</h2>
        <p className="lp-lead">AI saves time on the slow parts. It never supplies facts, and it does not decide what the document says about the law.</p>
        <table className="lp-table">
          <tbody>
            {aiRows.map(([what, who]) => (
              <tr key={what}><td>{what}</td><td>{who}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="lp-block lp-narrow">
        <h2>Your files</h2>
        <p>Files are stored privately. Only you and the advocate on your matter can open them, through links that expire within minutes. We do not sell your information, and you can delete your account from inside the app.</p>
        <p><Link href="/privacy" className="lp-textlink">Read the privacy policy</Link></p>
      </section>

      <section className="lp-block" id="questions">
        <h2>Questions</h2>
        <div className="lp-faq">
          {faqs.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-block lp-narrow" id="advocates">
        <h2>For advocates</h2>
        <p>Today our in-house advocate reviews every document. We are working on a way for more advocates to join, take on reviews, and carry a matter forward as their own case once the notice has gone out. It is not open yet. If you are an advocate and want to hear when it is, write to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</p>
      </section>

      <section className="lp-closing">
        <h2>Have something to put in writing?</h2>
        <div className="lp-actions">
          <Link href="/signup" className="button primary large">Create an account</Link>
          <Link href="/login" className="lp-textlink">Log in</Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-in">
          <div>
            <Brand href="/" tone="dark" />
            <p>Lawmedy helps you prepare documents. It is not a substitute for legal advice on complex disputes.</p>
          </div>
          <nav aria-label="Footer">
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#documents">Documents</a>
            <a href="#questions">Questions</a>
          </nav>
          <nav aria-label="Legal">
            <h4>Company</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/delete-account">Delete account</Link>
          </nav>
        </div>
        <p className="lp-copy">© {new Date().getFullYear()} Lawmedy</p>
      </footer>
    </div>
  );
}
