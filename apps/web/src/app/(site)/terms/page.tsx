import { LegalShell } from "@/components/legal-shell";
import { site } from "@/lib/site";
export const metadata = { title: "Terms of Use", description: "The terms that apply when you use Lawmedy." };

export default function Terms() {
  return (
    <LegalShell title="Terms of Use" intro="Please read these terms before using Lawmedy. By creating an account or using the service, you agree to them.">
      <h2>1. What Lawmedy does</h2>
      <p>Lawmedy helps you prepare two kinds of documents: legal notices and Right to Information (RTI) applications. You describe your situation and upload supporting documents; AI prepares a draft from the facts you confirm; our in-house advocate reviews the draft before the final PDF is made available to you.</p>

      <h2>2. Not legal advice; no lawyer-client relationship</h2>
      <p>Lawmedy prepares documents. It does not provide legal advice, representation or a prediction of any outcome, and using the service does not by itself create a lawyer-client relationship. For a complex or high-value dispute, you should consult a qualified advocate. You remain responsible for deciding whether, when and how to use the document.</p>

      <h2>3. Eligibility and your account</h2>
      <p>You must be at least 18 and able to enter a binding contract. Keep your login details confidential and tell us promptly if you suspect misuse. You are responsible for activity under your account.</p>

      <h2>4. Your information and responsibilities</h2>
      <ul>
        <li>Provide accurate and complete information. The document is only as reliable as the facts you give and confirm.</li>
        <li>Review every fact and the final document before you rely on or send it.</li>
        <li>Upload only documents you are entitled to share. Do not upload unlawful material.</li>
        <li>Do not use Lawmedy to harass, defame, threaten or defraud anyone, or to prepare documents containing statements you know to be false.</li>
      </ul>

      <h2>5. How documents are prepared</h2>
      <p>AI drafts only from the facts you confirmed and works within a fixed document format. An advocate may edit the draft, ask you questions, or decline to approve it. We may refuse or pause a matter that is incomplete, unlawful or unsuitable for the service. Lawmedy does not send your notice or RTI application to the other party or to the public authority; you do that yourself, and any government fee for an RTI application is paid by you directly to the authority.</p>

      <h2>6. Fees and payment</h2>
      <p>The price of a document is shown to you before you pay. Payments are processed by Razorpay. Refunds are covered in our <a href="/refunds">Refund Policy</a>.</p>

      <h2>7. Our intellectual property and your content</h2>
      <p>The Lawmedy service, brand and templates belong to us. You keep ownership of the information and documents you provide, and you give us permission to process them solely to provide the service to you. The final document prepared for you is yours to use for your own purpose.</p>

      <h2>8. Availability and changes</h2>
      <p>We work to keep the service available, but it may occasionally be unavailable or change. We may update these terms; continued use after an update means you accept the new terms.</p>

      <h2>9. Limits of liability</h2>
      <p>To the extent the law permits, Lawmedy is provided “as is”, and we are not liable for indirect or consequential losses, or for any outcome of a dispute or an RTI request. Our total liability for any claim relating to a document is limited to the amount you paid for that document. Nothing in these terms limits liability that cannot be limited by law.</p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by the laws of India. Courts in India have jurisdiction over any dispute, subject to any rights you have under applicable consumer law.</p>

      <h2>11. Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</p>
    </LegalShell>
  );
}
