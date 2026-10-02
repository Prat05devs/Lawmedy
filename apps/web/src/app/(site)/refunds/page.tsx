import { LegalShell } from "@/components/legal-shell";
import { site } from "@/lib/site";
export const metadata = { title: "Refund & Cancellation Policy", description: "When and how refunds are given for Lawmedy documents." };

export default function Refunds() {
  return (
    <LegalShell title="Refund & Cancellation Policy" intro="You pay once per document. Here is when a refund applies and how to ask for one.">
      <h2>1. What you pay for</h2>
      <p>Each legal notice or RTI application is a single paid matter. The price is shown before you pay, and you are charged only when you choose to continue to payment.</p>

      <h2>2. Cancelling</h2>
      <p>You can stop at any time before paying at no cost. Once you have paid, the work of preparing and reviewing your document begins immediately.</p>

      <h2>3. When you are entitled to a refund</h2>
      <ul>
        <li><strong>We cannot deliver your document.</strong> If we are unable to prepare or release your final PDF for a reason on our side, you receive a full refund.</li>
        <li><strong>Duplicate or failed charges.</strong> If you were charged twice or charged without your matter being marked as paid, we refund the extra or unmatched amount.</li>
        <li><strong>Matter declined.</strong> If our advocate declines a matter as unsuitable for the service, you receive a full refund.</li>
      </ul>

      <h2>4. When a refund is not available</h2>
      <p>Once your final document has been delivered to you, the service is complete and the fee is non-refundable. A document that is accurate to the facts you confirmed is not grounds for a refund because of the outcome of your dispute or RTI request, or because the other side or the authority did not respond.</p>

      <h2>5. How to request a refund</h2>
      <p>Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> from your account email with your matter reference number and the reason. We aim to reply within 3 business days.</p>

      <h2>6. How refunds are paid</h2>
      <p>Approved refunds go back to the original payment method through Razorpay. Banks and payment providers typically take 5 to 7 business days to show the credit.</p>
    </LegalShell>
  );
}
