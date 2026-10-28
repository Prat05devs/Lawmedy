import Image from "next/image";
import Link from "next/link";
import { Banknote, Check, FileText, Landmark, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { LandingNav, SiteFooter } from "@/components/landing-nav";
import { AssistantChat } from "@/components/assistant-chat";
import { AdvocateInterestForm } from "@/components/advocate-interest-form";
import { HomeStart } from "@/components/home-start";
import { BandVideo } from "@/components/landing/band-media";
import { LiveExample } from "@/components/landing/live-example";
import { UseCaseExplorer } from "@/components/landing/use-case-explorer";
import { site, whatsappDisplay, whatsappLink } from "@/lib/site";
import { getOptionalUser } from "@/lib/api";
import "./landing.css";

const steps = [
  { title: "Describe the problem", text: "A few plain sentences are enough. We ask only for what’s missing.", who: "You" },
  { title: "Add what you already have", text: "Agreements, receipts, bank transfers, screenshots. PDF or image, up to 10 MB each.", who: "You" },
  { title: "Confirm every fact", text: "Each date and amount is shown next to where it came from. If your account and a document disagree, you choose.", who: "You, with AI reading your files" },
  { title: "Pay securely", text: "Checkout through Razorpay. Work starts once the payment is verified.", who: "You" },
  { title: "Draft, review, download", text: "The draft uses only the facts you confirmed. An advocate edits it, may ask you a question, then approves it. Usually within 24 hours of verified payment.", who: "Lawmedy and an advocate" },
];

const aiRows = [
  ["Reading your statement and uploaded files", "AI"],
  ["Writing the subject, the facts and the demand", "AI, from facts you confirmed"],
  ["Checking the draft against those facts", "A second AI pass"],
  ["Names and addresses", "Copied from what you entered"],
  ["Legal provisions cited", "Chosen from a short list we vetted"],
  ["Final approval", "An advocate"],
];

const faqs = [
  { q: "Is this legal advice?", a: "No. Lawmedy prepares documents and an advocate reviews each one. For a large or complicated dispute, speak to an advocate before you send anything." },
  { q: "Do I need documents to start?", a: "No. You can begin with your own account. Documents make the draft more exact and let us check your facts against paper." },
  { q: "How do I receive the PDF?", a: "In your Lawmedy account, and our team also sends it to the WhatsApp number you give us, from Team Lawmedy’s number." },
  { q: "Do you send the notice or the RTI application for me?", a: "No. You get a PDF and you send it. For an RTI application, the government fee is paid by you directly to the authority." },
  { q: "Who can see my files?", a: "You, and the advocate working on your matter. Files are stored privately and opened only through links that expire within minutes." },
  { q: "What if my account and a document disagree?", a: "We show you both with their sources and you choose. The draft uses only what you confirm." },
  { q: "Can I delete my data?", a: "Yes. In the app, open Account and choose Delete my account. Your matters, uploads and drafts are erased." },
];

// Figures shown on the landing page, each with the original source. Checked October 2026.
// `whole` and the two-digit `part` are counted up separately, since CSS counters are integers.
type Stat = { whole: number; part?: number; unit?: string; text: string; source: string; href: string };
const stats: Stat[] = [
  { whole: 5, part: 64, unit: "crore", text: "cases pending across Indian courts.", source: "Law Minister’s reply in the Rajya Sabha, 23 July 2026, citing the National Judicial Data Grid", href: "https://telanganatoday.com/more-than-5-64-crore-cases-pending-across-indian-courts-rs" },
  { whole: 15, text: "judges for every 10 lakh people, against the 50 the Law Commission recommended in 1987.", source: "India Justice Report 2025", href: "https://indiajusticereport.org/" },
  { whole: 2, part: 10, unit: "crore", text: "disputes settled at one National Lok Adalat, without reaching a court.", source: "NALSA, 13 September 2025, reported by LiveLaw", href: "https://www.livelaw.in/news-updates/nalsa-3rd-national-lok-adalat-2025-303850" },
  { whole: 30, unit: "days", text: "to send a written demand after a cheque bounces.", source: "Section 138, Negotiable Instruments Act, 1881", href: "https://indiankanoon.org/doc/1823824/" },
];

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
  const fallback = { notice: site.priceLabel, rti: site.priceLabel, lending: "Fee shown at checkout" };
  try {
    const response = await fetch(`${process.env.API_URL || "http://127.0.0.1:4000"}/public/pricing`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallback;
    const p = (await response.json()) as { currency: string; legalNotice: number; rti: number; lendingCertificate: number };
    const fmt = (paise: number) => Number.isFinite(paise) && paise >= 0
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(paise / 100)
      : "Fee shown at checkout";
    return { notice: fmt(p.legalNotice), rti: fmt(p.rti), lending: fmt(p.lendingCertificate) };
  } catch {
    return fallback;
  }
}

function Ticks({ items }: { items: string[] }) {
  return <ul>{items.map((i) => <li key={i}><Check aria-hidden />{i}</li>)}</ul>;
}

function Count({ stat }: { stat: Stat }) {
  // CSS counts each number up as it scrolls into view; the label keeps the real figure for screen readers.
  const label = `${stat.whole}${stat.part !== undefined ? `.${String(stat.part).padStart(2, "0")}` : ""}${stat.unit ? ` ${stat.unit}` : ""}`;
  return (
    <div className="lx-num" role="img" aria-label={label}>
      <span className="lx-c1" style={{ "--a": stat.whole } as React.CSSProperties} />
      {stat.part !== undefined && <>.<span className="lx-c2" style={{ "--b": stat.part } as React.CSSProperties} /></>}
      {stat.unit && <small> {stat.unit}</small>}
    </div>
  );
}

export default async function Home() {
  const [quotes, prices, user] = await Promise.all([testimonials(), pricing(), getOptionalUser()]);
  const start = (path: string) => (user ? path : `/signup?next=${path}`);

  return (
    <div className="lx">
      <LandingNav user={user} />

      <section className="lx-band lx-hero" id="top">
        <BandVideo src="/media/advocate-desk.mp4" poster="/images/home/advocate-desk-poster.jpg" position="60% 40%" />
        <div className="lx-band-fade lx-fade-hero" />
        <div className="lx-wrap">
          <div className="lx-hero-copy">
            <h1><span className="lx-line"><span>The letter that</span></span><span className="lx-line"><span>gets things moving.</span></span></h1>
            <p className="lx-lede lx-fade lx-d1">
              Tell us what happened in your own words. We draft a legal notice, an RTI application or a lending certificate from the facts you confirm.
              An advocate reviews it, and the PDF reaches your WhatsApp, usually within 24 hours of verified payment.
            </p>
            <HomeStart signedIn={!!user} />
            <p className="lx-prices lx-fade lx-d3">
              <strong>{prices.notice}</strong> legal notice, <strong>{prices.rti}</strong> RTI application, <strong>{prices.lending}</strong> lending certificate.
            </p>
          </div>
        </div>
      </section>

      <section className="lx-band lx-chapter" id="usecases">
        <Image className="lx-band-media" src="/images/home/neighbours.jpg" alt="" fill sizes="100vw" style={{ objectPosition: "50% 40%" }} />
        <div className="lx-band-fade lx-fade-left" />
        <div className="lx-wrap">
          <div className="lx-head lx-rv">
            <h2>What’s happening to you?</h2>
            <p>Deposits, salaries, neighbours, builders, government files. Pick the part of life it touches to see which document fits, what it does, and what it costs.</p>
          </div>
        </div>
      </section>
      <section className="lx-after">
        <div className="lx-wrap">
          <UseCaseExplorer prices={prices} signedIn={!!user} />
        </div>
      </section>

      <section className="lx-band lx-chapter" id="services">
        <Image className="lx-band-media" src="/images/home/invoice.jpg" alt="" fill sizes="100vw" style={{ objectPosition: "70% 35%" }} />
        <div className="lx-band-fade lx-fade-left" />
        <div className="lx-wrap">
          <div className="lx-head lx-rv">
            <h2>Three documents, each for a different job</h2>
            <p>Each one is written only from facts you confirm, and an advocate approves it before you receive it.</p>
          </div>
        </div>
      </section>
      <section className="lx-after">
        <div className="lx-wrap lx-services">
          <article className="lx-card lx-svc lx-rv">
            <span className="lx-svc-icon" aria-hidden><FileText /></span>
            <h3>Legal notice</h3>
            <p className="lx-for">When someone owes you money, a refund, a deposit or a promise they made.</p>
            <div className="lx-price"><b>{prices.notice}</b><span>per notice</span></div>
            <Ticks items={["Sets out what happened, what you want, and by when", "Reviewed and approved by an advocate", "PDF in your account and on WhatsApp"]} />
            <p className="lx-note">You send it yourself, by post or courier.</p>
            <a className="lx-btn lx-btn-primary" href="#top">Start my legal notice</a>
          </article>
          <article className="lx-card lx-svc lx-rv">
            <span className="lx-svc-icon" aria-hidden><Landmark /></span>
            <h3>RTI application</h3>
            <p className="lx-for">When a government office won’t tell you what is happening with your file.</p>
            <div className="lx-price"><b>{prices.rti}</b><span>per application</span></div>
            <Ticks items={["Addressed to the right public authority", "Clear requests for records that exist", "The office must reply within 30 days"]} />
            <p className="lx-note">You file it and pay the government’s fee directly to the authority.</p>
            <Link className="lx-btn lx-btn-quiet" href={start("/matters/new/rti")}>File an RTI application</Link>
          </article>
          <article className="lx-card lx-svc lx-rv" id="lending">
            <span className="lx-svc-icon" aria-hidden><Banknote /></span>
            <h3>Lending certificate</h3>
            <p className="lx-for">When you lend or pay money to someone and want it on record now.</p>
            <div className="lx-price"><b>{prices.lending}</b><span>per certificate</span></div>
            <Ticks items={["Records the amount, transfer and repayment terms", "On an advocate’s letterhead, signed and stamped", "PDF within 24 hours of verified payment and complete details"]} />
            <p className="lx-note">Based on your facts and supporting records. Not an affidavit or a notarised document.</p>
            <Link className="lx-btn lx-btn-quiet" href={start("/matters/new/lending")}>Start a lending certificate</Link>
          </article>
        </div>
      </section>

      <section className="lx-band lx-why" id="why">
        <Image className="lx-band-media" src="/images/home/chamber.jpg" alt="" fill sizes="100vw" style={{ objectPosition: "50% 25%" }} />
        <div className="lx-band-fade lx-fade-why" />
        <div className="lx-wrap">
          <div className="lx-head lx-rv">
            <h2>Why put it in writing?</h2>
            <p>Courts are slow, and getting a notice drafted has meant taking leave and visiting an advocate’s chamber, so most people let it go. These numbers are why a clear written demand, sent early, matters.</p>
          </div>
          <div className="lx-stats lx-rv">
            {stats.map((s) => (
              <figure key={s.source} className="lx-stat">
                <Count stat={s} />
                <p>{s.text}</p>
                <cite>Source: <a href={s.href} target="_blank" rel="noopener noreferrer">{s.source}</a></cite>
              </figure>
            ))}
          </div>
          <p className="lx-why-line lx-rv">Most disputes end with a clear demand and a conversation, not a court date.</p>
        </div>
      </section>

      <section className="lx-sec" id="how">
        <div className="lx-wrap">
          <div className="lx-head lx-rv">
            <h2>From your story to a signed PDF</h2>
            <p>Five steps, and you stay in control of every fact. Watch one come together.</p>
          </div>
          <div className="lx-how">
            <div className="lx-how-demo"><LiveExample /></div>
            <div className="lx-tlbox">
              <span className="lx-tl-rail" aria-hidden />
              <span className="lx-tl-fill" aria-hidden />
              <ol className="lx-tl">
                {steps.map((s, i) => (
                  <li key={s.title} className="lx-rv">
                    <span className="lx-dot">{i + 1}</span>
                    <div><h3>{s.title}</h3><p>{s.text}</p><small>{s.who}</small></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="lx-sec" id="ai">
        <div className="lx-wrap">
          <div className="lx-head lx-rv">
            <h2>Where AI helps, and where people decide</h2>
            <p>AI saves time on the slow parts. It never supplies facts, and it doesn’t decide what your document says about the law.</p>
          </div>
          <table className="lx-table lx-rv">
            <thead><tr><th scope="col">Task</th><th scope="col">Done by</th></tr></thead>
            <tbody>{aiRows.map(([what, who]) => <tr key={what}><td>{what}</td><td>{who}</td></tr>)}</tbody>
          </table>
          <p className="lx-never lx-rv"><ShieldCheck aria-hidden />No invented facts, dates, amounts or citations. If something is missing, we ask you.</p>
        </div>
      </section>

      {quotes.length > 0 && (
        <section className="lx-sec" id="people">
          <div className="lx-wrap">
            <div className="lx-head lx-rv"><h2>What customers say</h2></div>
            <div className="lx-quotes">
              {quotes.map((q) => (
                <figure key={q.id} className="lx-rv">
                  <blockquote>{q.quote}</blockquote>
                  <figcaption>{q.name}{q.descriptor ? `, ${q.descriptor}` : ""}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="lx-sec" id="questions">
        <div className="lx-wrap lx-faq-grid">
          <div className="lx-rv">
            <div className="lx-head" style={{ marginBottom: 0 }}>
              <h2>Questions</h2>
              <p>Not sure which document you need? Message us on WhatsApp at <a href={whatsappLink} target="_blank" rel="noopener noreferrer">{whatsappDisplay}</a>.</p>
            </div>
            <div className="lx-card lx-privacy">
              <LockKeyhole aria-hidden />
              <h3>Your files stay private</h3>
              <p>Only you and the advocate on your matter can open them, through links that expire within minutes. We do not sell your information. <Link href="/privacy">Read the privacy policy</Link>.</p>
            </div>
          </div>
          <div className="lx-faq lx-rv">
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}<Plus aria-hidden /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lx-sec" id="advocates">
        <div className="lx-wrap">
          <div className="lx-card lx-adv lx-rv">
            <div>
              <h2>Are you an advocate?</h2>
              <p>Today our in-house advocates review every document. Our portal for independent advocates opens soon: requests arrive with the facts organised and documents attached, you review the draft on a digital desk, and you can take a matter forward as your own case.</p>
              <p>Register your interest and we’ll reach out when it opens.</p>
            </div>
            <AdvocateInterestForm />
          </div>
        </div>
      </section>

      <section className="lx-band lx-final">
        <BandVideo src="/media/street.mp4" poster="/images/home/street-poster.jpg" />
        <div className="lx-band-fade lx-fade-center" />
        <div className="lx-wrap">
          <h2 className="lx-rv">You have work to do. Put it in writing from your phone.</h2>
          <p className="lx-rv">No leave, no queue, no trip to a chamber. Start with a few sentences, add proof when you can, and come back any time.</p>
          <div className="lx-row lx-rv">
            <a className="lx-btn lx-btn-primary" href="#top">Start my legal notice</a>
            <a className="lx-btn lx-btn-quiet" href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp {whatsappDisplay}</a>
          </div>
        </div>
      </section>

      <SiteFooter />
      <AssistantChat prices={prices} />
    </div>
  );
}
