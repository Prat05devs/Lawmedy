import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LandingNav } from "@/components/landing-nav";
import { SampleNotice } from "@/components/sample-notice";
import { AssistantChat } from "@/components/assistant-chat";
import { AdvocateInterestForm } from "@/components/advocate-interest-form";
import { site } from "@/lib/site";
import { getOptionalUser } from "@/lib/api";
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

// Figures shown on the landing page, each with the original source. Checked October 2026.
type Fact = { figure: string; text: string; source: string; href: string };
const disputeFacts: Fact[] = [
  { figure: "5.64 crore", text: "cases pending across Indian courts, from the Supreme Court to district courts. Over 80,000 cases in high courts have waited more than 30 years.", source: "Law Minister's written reply in the Rajya Sabha, 23 July 2026, citing the National Judicial Data Grid", href: "https://telanganatoday.com/more-than-5-64-crore-cases-pending-across-indian-courts-rs" },
  { figure: "15", text: "judges for every 10 lakh people in India, against the 50 the Law Commission recommended in 1987.", source: "India Justice Report 2025", href: "https://indiajusticereport.org/" },
  { figure: "₹50,000 crore", text: "lost every year in wages and business by people attending court hearings. With legal fees, the cost passes ₹80,000 crore.", source: "DAKSH, Access to Justice Survey", href: "https://www.dakshindia.org/2016/04/21/" },
  { figure: "2.10 crore", text: "disputes settled before ever reaching a court, at a single National Lok Adalat on 13 September 2025. Most disputes can end with a clear demand and a conversation.", source: "NALSA, 3rd National Lok Adalat 2025, reported by LiveLaw", href: "https://www.livelaw.in/news-updates/nalsa-3rd-national-lok-adalat-2025-303850" },
  { figure: "66%", text: "of Americans faced at least one legal problem in four years. Legal trouble is part of everyday life everywhere; what changes the outcome is acting on it, in writing.", source: "IAALS and HiiL, Justice Needs and Satisfaction in the United States, 2021", href: "https://iaals.du.edu/publications/justice-needs-and-satisfaction-united-states-america" },
];
const lawFacts: Fact[] = [
  { figure: "2 months", text: "of written notice the law requires before anyone can sue the government or a public officer.", source: "Section 80, Code of Civil Procedure, 1908", href: "https://indiankanoon.org/doc/55198661/" },
  { figure: "30 days", text: "to send a written demand after a cheque bounces. The other side then has 15 days to pay before a complaint can be filed.", source: "Section 138, Negotiable Instruments Act, 1881", href: "https://indiankanoon.org/doc/1823824/" },
];
const rtiFacts: Fact[] = [
  { figure: "30 days", text: "for a public information officer to reply to an RTI application, or 48 hours where a person's life or liberty is at stake.", source: "Section 7(1), Right to Information Act, 2005", href: "https://indiankanoon.org/doc/1831074/" },
  { figure: "4,13,972", text: "appeals and complaints waiting at India's information commissions on 30 June 2025.", source: "Satark Nagrik Sangathan, Report Card on Information Commissions 2024-25", href: "https://www.snsindia.org/wp-content/uploads/2025/10/Press-Release-2025.pdf" },
  { figure: "18 of 29", text: "information commissions would take more than a year to decide a new appeal. A clear, specific first application is the best way to stay out of that queue.", source: "Satark Nagrik Sangathan, Report Card on Information Commissions 2024-25", href: "https://www.snsindia.org/wp-content/uploads/2025/10/Press-Release-2025.pdf" },
];

function FactGrid({ items }: { items: Fact[] }) {
  return (
    <div className="lp-facts">
      {items.map((f) => (
        <figure key={f.figure + f.source} className="lp-fact">
          <strong>{f.figure}</strong>
          <p>{f.text}</p>
          <figcaption>Source: <a href={f.href} target="_blank" rel="noopener noreferrer">{f.source}</a></figcaption>
        </figure>
      ))}
    </div>
  );
}

type Testimonial = { id: string; name: string; descriptor: string | null; quote: string };
async function testimonials(): Promise<Testimonial[]> {
  try {
    const response = await fetch(`${process.env.API_URL || "http://127.0.0.1:4000"}/public/testimonials`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    return response.ok ? ((await response.json()) as Testimonial[]) : [];
  } catch {
    return [];
  }
}

async function pricing() {
  const fallback = { notice: site.priceLabel, rti: site.priceLabel };
  try {
    const response = await fetch(`${process.env.API_URL || "http://127.0.0.1:4000"}/public/pricing`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallback;
    const p = (await response.json()) as { currency: string; legalNotice: number; rti: number };
    const fmt = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(paise / 100);
    return { notice: fmt(p.legalNotice), rti: fmt(p.rti) };
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const [quotes, prices, user] = await Promise.all([testimonials(), pricing(), getOptionalUser()]);
  return (
    <div className="lp">
      <LandingNav user={user} />

      <section className="lp-hero" id="top">
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
        <figure className="lp-wide">
          <Image src="/images/site/court-chambers.webp" alt="Advocates' chambers, a stamp vendor and a typist outside a district court" width={1800} height={1142} sizes="(max-width: 1120px) 100vw, 1072px" />
        </figure>
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
          <Image className="lp-doc-photo" src="/images/site/neighbourhood-dispute.webp" alt="Neighbours arguing over a boundary in a housing society" width={1800} height={1142} sizes="(max-width: 900px) 100vw, 520px" />
          <h2>A legal notice</h2>
          <p>For money someone owes you, a deposit or refund not returned, a broken agreement, or a consumer or property dispute. It sets out what happened in order, where the other side defaulted, what you want, and by when.</p>
          <p className="lp-note">You send it yourself, by post or courier. We do not deliver it.</p>
        </div>
        <div>
          <figure className="lp-credit-fig">
            <Image className="lp-doc-photo" src="/images/courts/supreme-court-2.jpg" alt="The Supreme Court of India, New Delhi" width={1600} height={1067} sizes="(max-width: 900px) 100vw, 520px" />
            <figcaption>Supreme Court of India. Photo: <a href="https://commons.wikimedia.org/wiki/File:Supreme_Court_of_India.jpg" rel="noopener">Subhashish Panigrahi</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">CC BY-SA 4.0</a></figcaption>
          </figure>
          <h2>An RTI application</h2>
          <p>A Section 6(1) application to a central, state or local public authority. You choose the authority and the period. Each request asks for one record that exists, such as a file noting, an order or a sanction letter.</p>
          <p className="lp-note">You file it and pay the government’s application fee directly to the authority.</p>
        </div>
      </section>

      <section className="lp-block" id="facts">
        <h2>Why we built Lawmedy</h2>
        <p className="lp-lead">In many countries, people put a dispute in writing as a matter of habit, and the other side knows it. In India, most people let it go: the courts are slow, and getting a notice drafted means taking leave and visiting an advocate&apos;s chamber. These numbers are why a clear legal notice, sent early, matters.</p>
        <h3 className="lp-facts-h">Disputes and courts</h3>
        <FactGrid items={disputeFacts} />
        <h3 className="lp-facts-h">What the law already expects</h3>
        <FactGrid items={lawFacts} />
        <h3 className="lp-facts-h">Right to Information</h3>
        <FactGrid items={rtiFacts} />
        <p className="lp-note">Figures are from the sources linked, checked in October 2026. Live court pendency is published on the <a href="https://njdg.ecourts.gov.in/" target="_blank" rel="noopener noreferrer">National Judicial Data Grid</a>.</p>
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

      {quotes.length > 0 && (
        <section className="lp-block" id="people">
          <h2>What customers say</h2>
          <div className="lp-quotes">
            {quotes.map((q) => (
              <figure key={q.id}>
                <blockquote>{q.quote}</blockquote>
                <figcaption>{q.name}{q.descriptor ? `, ${q.descriptor}` : ""}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

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
        <p className="lp-soon">Coming soon · Advocate portal</p>
        <p>Today our in-house advocates review every document. Our portal for independent advocates is almost ready: requests arrive with the facts organised and the documents attached, you review the draft on a digital desk, and you can carry a matter forward as your own case once the notice has gone out. Register your interest and we will reach out when it opens.</p>
        <AdvocateInterestForm />
      </section>

      <section className="lp-closing">
        <h2>Have something to put in writing?</h2>
        <div className="lp-actions">
          <Link href="/signup" className="button primary large">Create an account</Link>
          <Link href="/login" className="lp-textlink">Log in</Link>
        </div>
      </section>

      <AssistantChat prices={prices} />

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
