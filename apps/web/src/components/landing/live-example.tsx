"use client";
import { useEffect, useState } from "react";
import { Check, FileCheck2 } from "lucide-react";

// An illustrative walk-through of one document being prepared: the user's words, the facts they
// confirm, the draft, the advocate's approval and the PDF arriving. Clearly labelled as an example.
const examples = [
  {
    label: "Legal notice",
    words: "I paid ₹45,000 as deposit for a flat in Pune. I moved out on 2 March and the landlord won’t return it.",
    facts: [["Deposit", "₹45,000"], ["Moved out", "2 March 2026"], ["Landlord", "[name you give]"]],
    doc: "Legal notice",
    meta: "Through Adv. [name], on behalf of [you]",
    subject: "Return of security deposit of ₹45,000",
    body: "My client vacated the premises on 2 March 2026. You are called upon to return ₹45,000 within 15 days of receiving this notice.",
    file: "Legal_notice_deposit.pdf",
  },
  {
    label: "RTI",
    words: "My father’s pension file has been pending at the district treasury since January. Nobody tells us why.",
    facts: [["Authority", "District Treasury"], ["Period", "Jan to Oct 2026"], ["Record", "File notings"]],
    doc: "Application under Section 6(1), RTI Act, 2005",
    meta: "To the Public Information Officer, [office]",
    subject: "Status of pension case [number]",
    body: "Please provide certified copies of the file notings on this case, and the name of the officer it is pending with.",
    file: "RTI_pension_status.pdf",
  },
  {
    label: "Lending",
    words: "I sent ₹1,20,000 to my cousin by UPI on 10 August. He’ll pay it back by December.",
    facts: [["Amount", "₹1,20,000"], ["Paid", "10 Aug 2026, UPI"], ["Repay by", "31 Dec 2026"]],
    doc: "Lending certificate",
    meta: "On the letterhead of Adv. [name]",
    subject: "Money lent to [borrower]",
    body: "This records that ₹1,20,000 was transferred on 10 August 2026 by UPI, to be repaid by 31 December 2026, as stated by the lender and supported by the transfer record.",
    file: "Lending_certificate.pdf",
  },
];
const stepNames = ["", "You write", "You confirm the facts", "We draft", "An advocate approves", "On your WhatsApp", "On your WhatsApp"];
const LAST = stepNames.length - 1;

export function LiveExample() {
  const [{ ex, stage }, setStep] = useState({ ex: 0, stage: 1 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep({ ex: 0, stage: 5 });
      return;
    }
    const timer = window.setInterval(() => {
      setStep((s) => (s.stage < LAST ? { ...s, stage: s.stage + 1 } : { ex: (s.ex + 1) % examples.length, stage: 0 }));
    }, 1700);
    return () => window.clearInterval(timer);
  }, []);

  const cur = examples[ex];
  const on = (n: number) => (stage >= n ? "lx-stage on" : "lx-stage");

  return (
    <div className="lx-card lx-composer" aria-label="Example of a document being prepared">
      <div className="lx-tabs" role="tablist" aria-label="Choose an example">
        {examples.map((e, i) => (
          <button key={e.label} type="button" role="tab" aria-selected={i === ex} className="lx-tab" onClick={() => setStep({ ex: i, stage: 0 })}>
            {e.label}
          </button>
        ))}
      </div>
      <div className="lx-example-note"><span>Example</span><span aria-live="polite">{stepNames[stage]}</span></div>

      <div className={on(1)}>
        <p className="lx-who">You write</p>
        <div className="lx-bubble"><span className="lx-typed">{cur.words}</span></div>
      </div>
      <div className={on(2)}>
        <div className="lx-facts">
          {cur.facts.map(([k, v]) => (
            <div key={k} className="lx-fact"><small>{k}</small><b><Check aria-hidden />{v}</b></div>
          ))}
        </div>
      </div>
      <div className={on(3)}>
        <div className="lx-paper">
          <h4>{cur.doc}</h4>
          <p className="lx-meta">{cur.meta}</p>
          <p><strong>Subject:</strong> {cur.subject}</p>
          <p>{cur.body}</p>
          <div className="lx-rule" style={{ width: "90%" }} />
          <div className="lx-rule" style={{ width: "72%" }} />
          <div className={stage >= 4 ? "lx-stamp on" : "lx-stamp"} aria-hidden>REVIEWED<br />&amp; APPROVED<br />ADVOCATE</div>
        </div>
      </div>
      <div className={on(5)}>
        <div className="lx-deliver">
          <FileCheck2 aria-hidden />
          <div><b>{cur.file}</b><span>Sent to your WhatsApp and saved in your account</span></div>
        </div>
      </div>
      <div className="lx-progress" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => <i key={n} className={stage >= n ? "on" : ""} />)}
      </div>
    </div>
  );
}
