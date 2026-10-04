import Link from "next/link";
import { LegalShell } from "@/components/legal-shell";
import { site } from "@/lib/site";
export const metadata = { title: "Contact & Support", description: "Get help with Lawmedy, your matter, payments or your data." };

export default function Contact() {
  return (
    <LegalShell title="Contact & support" intro="We are here to help with your matter, a payment, or your data.">
      <h2>Email us</h2>
      <p><a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p>
      <p>Please write from the email address on your Lawmedy account and include your matter reference number if you have one. We aim to reply within 3 business days.</p>

      <h2>Common requests</h2>
      <ul>
        <li><strong>My matter or document:</strong> include the reference number shown on your matter page.</li>
        <li><strong>Payment or refund:</strong> see the <Link href="/refunds">Refund Policy</Link>, then email us the matter reference and payment details.</li>
        <li><strong>Delete my account or data:</strong> follow the steps on <Link href="/delete-account">Delete your account</Link>.</li>
        <li><strong>Privacy question or complaint:</strong> write to <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>. See the <Link href="/privacy">Privacy Policy</Link>.</li>
      </ul>

      <h2>Are you an advocate?</h2>
      <p>Our advocate portal is coming soon. <Link href="/#advocates">Register your interest</Link> and we will reach out by phone or email when it opens.</p>
      {site.address && (<><h2>Address</h2><p>{site.address}</p></>)}
    </LegalShell>
  );
}
