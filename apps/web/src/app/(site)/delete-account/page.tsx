import Link from "next/link";
import { LegalShell } from "@/components/legal-shell";
import { site } from "@/lib/site";
export const metadata = { title: "Delete your account", description: "How to request deletion of your Lawmedy account and data." };

export default function DeleteAccount() {
  const subject = encodeURIComponent("Delete my Lawmedy account");
  const body = encodeURIComponent("Please delete my Lawmedy account and the data associated with it.\n\nAccount email: ");
  return (
    <LegalShell title="Delete your account" intro="You can ask us to permanently delete your Lawmedy account and the data tied to it.">
      <h2>Delete it yourself in the app</h2>
      <p>Open the Lawmedy app, go to <strong>Account</strong>, tap <strong>Delete my account</strong> and type DELETE to confirm. Your content is erased straight away.</p>

      <h2>Or ask us to do it</h2>
      <p>If you cannot use the app, we will delete it for you:</p>
      <ol>
        <li>Send an email to <a href={`mailto:${site.privacyEmail}?subject=${subject}&body=${body}`}>{site.privacyEmail}</a> from the email address registered on your account, with the subject “Delete my Lawmedy account”.</li>
        <li>We confirm it is you and reply to acknowledge the request.</li>
        <li>We delete your account and data within 30 days and confirm when it is done.</li>
      </ol>
      <p><a className="button gold" href={`mailto:${site.privacyEmail}?subject=${subject}&body=${body}`}>Email a deletion request</a></p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account profile (name, email, sign-in details).</li>
        <li>Your matters, statements, answers and extracted facts.</li>
        <li>Every file you uploaded, and the final documents generated for you.</li>
        <li>Your saved contact details and notifications.</li>
      </ul>

      <h2>What we may keep</h2>
      <p>We may retain limited records that the law requires us to keep, such as payment records and security or audit logs, for as long as that law requires. These are kept separately from your documents and are not used for anything else.</p>

      <h2>Before you delete</h2>
      <p>Deletion cannot be undone. Download any final PDF you still need before you ask. If you only want to remove one matter or correct something, email us instead at <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</p>
      <p>Read more in our <Link href="/privacy">Privacy Policy</Link>.</p>
    </LegalShell>
  );
}
