import { LegalShell } from "@/components/legal-shell";
import { site } from "@/lib/site";
export const metadata = { title: "Privacy Policy", description: "How Lawmedy collects, uses, shares and protects your information." };

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" intro="Legal matters are personal. This page explains exactly what we collect, why, who handles it, and the control you have over it.">
      <h2>1. Who we are</h2>
      <p>Lawmedy (“we”, “us”) provides a service that helps people prepare legal notices and RTI applications. This policy applies to our website and our mobile app. For privacy questions, write to <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>.</p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and a securely hashed password, or your name and email if you sign in with Google.</li>
        <li><strong>Your matter:</strong> the statement you write, your answers to our follow-up questions, and the facts extracted from them.</li>
        <li><strong>Documents you upload:</strong> PDFs and images such as agreements, receipts, transfers and screenshots, and the information read from them.</li>
        <li><strong>Contact details for the document:</strong> your postal address and phone number, and the recipient or public authority details you provide.</li>
        <li><strong>Payment information:</strong> the status, amount and reference of a payment. Card, UPI and bank details are entered with our payment processor and are never stored by us.</li>
        <li><strong>Review activity:</strong> edits, comments and questions exchanged with the advocate reviewing your matter.</li>
        <li><strong>Free check without an account:</strong> if you try the quick check before signing up, we send the text you typed to our AI provider to give you a result. We do not save the text or link it to you; we keep an automated log of the AI&rsquo;s response for diagnostics.</li>
        <li><strong>Testimonials:</strong> we show a customer&rsquo;s words and name only with their permission, which we record.</li>
        <li><strong>Technical records:</strong> logs of actions on your account (for security and audit), and basic device and request information needed to run the service.</li>
      </ul>
      <p>We do not use advertising trackers and we do not sell your personal information.</p>

      <h2>3. How we use it</h2>
      <ul>
        <li>To create and operate your account.</li>
        <li>To draft your document from the facts you confirmed, using AI processing described below.</li>
        <li>To let our in-house advocate review, edit and approve your document and to contact you if more information is needed.</li>
        <li>To take payment, issue your final PDF, and send you notifications about your matter.</li>
        <li>To keep the service secure, prevent misuse, and meet legal obligations.</li>
      </ul>

      <h2>4. AI processing</h2>
      <p>To read your statement and documents and prepare a draft, we send them to Google’s Gemini API from our servers. The AI works only from the facts you provide and confirm; every AI request is logged. We use a paid Gemini configuration, under which Google states that submitted content is not used to train its models. The draft is not delivered to you until it has been reviewed by an advocate.</p>

      <h2>5. Who we share information with</h2>
      <ul>
        <li><strong>Our advocate:</strong> the advocate reviewing your matter can see your statement, facts, documents and draft.</li>
        <li><strong>Service providers</strong> acting for us: Google (AI processing and, if you choose it, Google sign-in), Razorpay (payments), our email provider (notifications), and our hosting and database providers.</li>
        <li><strong>Authorities and courts,</strong> only where the law requires us to disclose information.</li>
      </ul>
      <p>We do not send your document to the other party or to any authority on your behalf. You decide what happens to your final document.</p>

      <h2>6. Storage and security</h2>
      <p>Uploaded files are stored privately, are never given a public link, and are accessible only to you and the advocate assigned to your matter, through short-lived signed links. Passwords are hashed. Connections to our service use encryption in transit. No system is perfectly secure, but we work to protect your information and limit access to those who need it.</p>

      <h2>7. How long we keep it</h2>
      <p>We keep your information while your account is active. If you ask us to delete your account, we delete your personal data and uploaded files as described on our <a href="/delete-account">account deletion page</a>. We may retain limited records, such as payment and audit records, for as long as the law requires.</p>

      <h2>8. Your choices and rights</h2>
      <p>You can ask us to access, correct, export or delete your personal information, to withdraw consent for processing, or to raise a concern. Write to <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a> from the email address on your account. To delete your account, follow the steps on the <a href="/delete-account">account deletion page</a>.</p>

      <h2>9. Children</h2>
      <p>Lawmedy is for adults aged 18 and over. We do not knowingly collect information from children.</p>

      <h2>10. Changes to this policy</h2>
      <p>If we make material changes, we will update the date at the top of this page and, where appropriate, notify you in the app or by email.</p>

      <h2>11. Contact</h2>
      <p>Questions or complaints about your data: <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>.{site.address ? ` Address: ${site.address}.` : ""}</p>
    </LegalShell>
  );
}
