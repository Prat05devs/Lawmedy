import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LandingNav } from "@/components/landing-nav";
import { AssistantChat } from "@/components/assistant-chat";
import { AdvocateInterestForm } from "@/components/advocate-interest-form";
import { ArrowRight, IndianRupee, Lock, MessageCircle, Scale } from "lucide-react";
import { HomeStart, ScenarioLink } from "@/components/home-start";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import { site, whatsappDisplay, whatsappLink } from "@/lib/site";
import { getOptionalUser } from "@/lib/api";
import "./landing.css";

const steps = [
  { title: "You describe the problem", text: "A few plain sentences are enough. We read what you wrote and ask only for what is missing." },
  { title: "You add what you already have", text: "Agreements, receipts, bank transfers, screenshots. PDF or image, up to 10 MB each. We read them for names, amounts and dates." },
  { title: "You confirm every fact", text: "Each date and amount is shown next to where it came from. If your account and a document disagree, you pick the right one." },
  { title: "You pay securely", text: "Pay through Razorpay checkout. We confirm the payment securely and your document work begins." },
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
  { q: "How do I receive the PDF?", a: "In your Lawmedy account, and our team also sends it to the WhatsApp number you give us, from Team Lawmedy's number." },
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

// Photos for the facts section. Wikimedia Commons images are CC BY-SA 4.0 and must be credited.
const courtStrip = [
  { src: "/images/courts/bombay-high-court.jpg", alt: "Bombay High Court, Mumbai", by: "Gnoeee", href: "https://commons.wikimedia.org/wiki/File:Bombay_High_Court_building.jpg", w: 1600, h: 1200 },
  { src: "/images/courts/madras-high-court.jpg", alt: "Madras High Court, Chennai", by: "Kalyan07kumar", href: "https://commons.wikimedia.org/wiki/File:Madras_High_Court,Chennai.jpg", w: 1600, h: 1067 },
  { src: "/images/courts/calcutta-high-court.jpg", alt: "Calcutta High Court, Kolkata", by: "Pinakpani", href: "https://commons.wikimedia.org/wiki/File:Building_of_Calcutta_High_Court_01.jpg", w: 1600, h: 1200 },
];

function FactBanner({ src, alt, caption, credit }: { src: string; alt: string; caption: string; credit: React.ReactNode }) {
  return (
    <figure className="lp-facts-banner">
      <Image src={src} alt={alt} width={1600} height={1067} sizes="(max-width: 1120px) 100vw, 1072px" />
      <figcaption><span>{caption}</span><small>{credit}</small></figcaption>
    </figure>
  );
}

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

const stepTone = ["bg-mor", "bg-genda text-robe", "bg-rani", "bg-mor", "bg-genda text-robe"];
const bandTone: Record<string, string> = { genda: "bg-genda", mor: "bg-mor", rani: "bg-rani", ink: "bg-robe" };

export default async function Home() {
  const [quotes, prices, user] = await Promise.all([testimonials(), pricing(), getOptionalUser()]);
  return (
    <div className="lp">
      <LandingNav user={user} />

      <section className="bg-robe text-white" id="top">
        <HomeStart
          signedIn={!!user}
          intro={<>
            <h1 className="m-0 mb-4 max-w-[19ch] text-[clamp(32px,4vw,50px)] leading-[1.06] text-white">
              Legal notices, RTI applications and lending certificates, <span className="text-genda">on your side.</span>
            </h1>
            <p className="mt-0 mb-6 max-w-[54ch] text-[17px] leading-relaxed text-white/80">
              Someone owes you money or isn&apos;t keeping their word? Tell us what happened in your own words.
              Choose a service below. You confirm each fact, an advocate reviews your document, and the PDF reaches you on WhatsApp.
            </p>
          </>}
          footer={<p className="mt-4 mb-0 text-[15px] font-semibold text-white">{prices.notice} per notice · usually ready within 24 hours of verified payment</p>}
        />
      </section>

      <section aria-label="Why Lawmedy" className="border-b border-border bg-white">
        <ul className="mx-auto m-0 grid max-w-[1120px] list-none grid-cols-1 gap-x-8 gap-y-3 px-6 py-5 text-[15px] font-medium sm:grid-cols-2 lg:grid-cols-4">
          <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-genda-tint text-genda-ink"><IndianRupee className="size-4" aria-hidden /></span>Clear fees for all three services</li>
          <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-mor-tint text-mor-ink"><Scale className="size-4" aria-hidden /></span>Reviewed by an advocate</li>
          <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-rani-tint text-rani-ink"><MessageCircle className="size-4" aria-hidden /></span>PDF on WhatsApp, usually in 24 hours</li>
          <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-muted text-foreground"><Lock className="size-4" aria-hidden /></span>Your files stay private</li>
        </ul>
      </section>

      <section className="lp-block border-t-0" id="situations">
        <h2>Situations we help with</h2>
        <p className="lp-lead">Pick the one closest to yours and we&apos;ll start your story at the top of the page.</p>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {categories.map((c) => (
            <Card key={c.title} className="gap-3 overflow-hidden py-0">
              <div aria-hidden className={cn("h-2", bandTone[c.tone])} />
              <CardHeader className="px-5 pt-2">
                <CardTitle className="text-lg">{c.title}</CardTitle>
                <CardDescription className="text-[14.5px]">{c.text}</CardDescription>
              </CardHeader>
              <CardContent className="grid justify-items-start px-5 pb-4">
                {c.items.map((item) => <ScenarioLink key={item} title={item} />)}
              </CardContent>
            </Card>
          ))}
          <Card className="gap-3 overflow-hidden py-0">
            <div aria-hidden className="h-2 bg-mor" />
            <CardHeader className="px-5 pt-2">
              <CardTitle className="text-lg">Record money already lent</CardTitle>
              <CardDescription className="text-[14.5px]">Money lent to friends or family, personal loans and payments already made. Record the amount, transfer and repayment terms you provide.</CardDescription>
            </CardHeader>
            <CardFooter className="px-5 pb-5"><Button asChild variant="outline"><Link href={user ? "/matters/new/lending" : "/signup?next=/matters/new/lending"}>Start a lending certificate</Link></Button></CardFooter>
          </Card>
          <Card className="gap-3 overflow-hidden bg-robe py-0 text-white">
            <div aria-hidden className="h-2 bg-white/20" />
            <CardHeader className="px-5 pt-2">
              <CardTitle className="text-lg">Government records (RTI)</CardTitle>
              <CardDescription className="text-[14.5px] text-white/75">Ask any public office for information under the Right to Information Act.</CardDescription>
            </CardHeader>
            <CardFooter className="px-5 pb-5">
              <Button asChild className="bg-genda text-robe hover:bg-genda/90"><Link href={user ? "/matters/new/rti" : "/signup?next=/matters/new/rti"}>File an RTI application <ArrowRight aria-hidden /></Link></Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="lp-block" id="how">
        <h2>What happens after you start</h2>
        <ol className="m-0 grid list-none gap-6 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className={cn("grid size-10 place-items-center rounded-full font-[family-name:var(--font-serif)] text-lg font-extrabold text-white", stepTone[index])}>{index + 1}</span>
              <h3 className="m-0 text-[17px] leading-snug">{step.title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
        <figure className="lp-wide mt-10 mb-0">
          <Image src="/images/site/court-chambers.webp" alt="Advocates' chambers, a stamp vendor and a typist outside a district court" width={1800} height={1142} sizes="(max-width: 1120px) 100vw, 1072px" />
        </figure>
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

      <section className="lp-block" id="price">
        <h2>Three services, clear prices</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2 border-robe">
            <CardHeader>
              <CardDescription className="text-[15px] font-semibold text-foreground">Legal notice</CardDescription>
              <CardTitle className="font-[family-name:var(--font-serif)] text-5xl font-extrabold tracking-tight">{prices.notice}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
                <li>✓ Written only from the facts you confirm</li>
                <li>✓ Reviewed and approved by an advocate</li>
                <li>✓ PDF in your account and on WhatsApp</li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto"><Button asChild size="lg" className="h-11"><a href="#top">Start my legal notice <ArrowRight aria-hidden /></a></Button></CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="text-[15px] font-semibold text-foreground">RTI application</CardDescription>
              <CardTitle className="font-[family-name:var(--font-serif)] text-5xl font-extrabold tracking-tight">{prices.rti}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
                <li>✓ Addressed to the right public authority</li>
                <li>✓ Clear requests for records that exist</li>
                <li>✓ You pay the government fee to the authority</li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto"><Button asChild size="lg" variant="outline" className="min-h-11 h-auto whitespace-normal"><Link href={user ? "/matters/new/rti" : "/signup?next=/matters/new/rti"}>File an RTI application</Link></Button></CardFooter>
          </Card>
          <Card id="lending" className="border-mor">
            <CardHeader>
              <CardDescription className="text-[15px] font-semibold text-foreground">Lending certificate</CardDescription>
              <CardTitle className="font-[family-name:var(--font-serif)] text-5xl font-extrabold tracking-tight">{prices.lending}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
                <li>✓ Records money already paid or lent</li>
                <li>✓ Advocate’s letterhead, signature and stamp</li>
                <li>✓ PDF within 24 hours of verified payment and complete information</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">Based on your facts and supporting records. Not an affidavit or notarised document.</p>
            </CardContent>
            <CardFooter className="mt-auto"><Button asChild size="lg" variant="outline" className="min-h-11 h-auto whitespace-normal"><Link href={user ? "/matters/new/lending" : "/signup?next=/matters/new/lending"}>Start my lending certificate</Link></Button></CardFooter>
          </Card>
        </div>
      </section>



      <section className="lp-block" id="facts">
        <h2>Why we built Lawmedy</h2>
        <p className="lp-lead">In many countries, people put a dispute in writing as a matter of habit, and the other side knows it. In India, most people let it go: the courts are slow, and getting a notice drafted means taking leave and visiting an advocate&apos;s chamber. These numbers are why a clear legal notice, sent early, matters.</p>
        <div className="lp-court-strip">
          {courtStrip.map((c) => (
            <figure key={c.src}>
              <Image src={c.src} alt={c.alt} width={c.w} height={c.h} sizes="(max-width: 700px) 100vw, 360px" />
              <figcaption>{c.alt} · Photo: <a href={c.href} target="_blank" rel="noopener noreferrer">{c.by}</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></figcaption>
            </figure>
          ))}
        </div>
        <h3 className="lp-facts-h">Disputes and courts</h3>
        <FactGrid items={disputeFacts} />
        <FactBanner src="/images/photos/law-library.jpg" alt="Shelves of law reports in a library" caption="Some disputes cannot even reach a court without a written notice first." credit={<>Photo: Iñaki del Olmo, <a href="https://unsplash.com/photos/NIJuEQw0RKg" target="_blank" rel="noopener noreferrer">Unsplash</a></>} />
        <h3 className="lp-facts-h">What the law already expects</h3>
        <FactGrid items={lawFacts} />
        <FactBanner src="/images/photos/rashtrapati.jpg" alt="Rashtrapati Bhavan, New Delhi" caption="Every public authority in India must answer an RTI application within 30 days." credit={<>Photo: Laurentiu Morariu, <a href="https://unsplash.com/photos/8XZTZIfuNrM" target="_blank" rel="noopener noreferrer">Unsplash</a></>} />
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

      <section className="lp-block lp-narrow" id="questions">
        <h2>Questions</h2>
        <Accordion type="single" collapsible className="border-t border-border">
          {faqs.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="text-[15.5px] leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="lp-block lp-narrow" id="advocates">
        <h2>For advocates</h2>
        <p className="text-[15px] font-semibold text-muted-foreground">Coming soon: the advocate portal.</p>
        <p>Today our in-house advocates review every document. Our portal for independent advocates is almost ready: requests arrive with the facts organised and the documents attached, you review the draft on a digital desk, and you can carry a matter forward as your own case once the notice has gone out. Register your interest and we will reach out when it opens.</p>
        <AdvocateInterestForm />
      </section>

      <section className="bg-robe text-white">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-6 px-6 py-16">
          <h2 className="m-0 max-w-[18ch] text-[clamp(28px,3.5vw,44px)] leading-tight text-white">Have something to put in <span className="text-genda">writing?</span></h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 bg-genda px-6 text-base font-semibold text-robe hover:bg-genda/90"><a href="#top">Start my legal notice <ArrowRight aria-hidden /></a></Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp {whatsappDisplay}</a>
            </Button>
          </div>
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
            <a href="#situations">Situations</a>
            <a href="#price">Price</a>
            <a href="#questions">Questions</a>
          </nav>
          <nav aria-label="Legal">
            <h4>Company</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/contact">Contact</Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp {whatsappDisplay}</a>
            <Link href="/delete-account">Delete account</Link>
          </nav>
        </div>
        <p className="lp-copy">© {new Date().getFullYear()} Lawmedy</p>
      </footer>
    </div>
  );
}
