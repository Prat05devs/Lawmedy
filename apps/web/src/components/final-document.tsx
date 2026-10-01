"use client";

import { useActionState } from "react";
import { Download, FileCheck2, LoaderCircle, MailCheck, RefreshCw } from "lucide-react";
import type { FinalDocument } from "@/lib/api";
import { retryFinalDocument } from "@/lib/actions";

export function FinalDocumentPanel({
  matterId,
  finalDocument,
  matterType,
}: {
  matterId: string;
  finalDocument: FinalDocument;
  matterType: "LEGAL_NOTICE" | "RTI";
}) {
  const [state, action, pending] = useActionState(
    retryFinalDocument.bind(null, matterId),
    {},
  );
  if (finalDocument.state === "NOT_READY") return null;

  return (
    <section className="panel final-document-panel">
      <div className="panel-heading">
        <span className="step-number">07</span>
        <div>
          <h2>Your {matterType === "RTI" ? "RTI Application" : "Legal Notice"} is Ready</h2>
          <p className="muted small">
            The final document is private and available only after sign-in.
          </p>
        </div>
      </div>
      {finalDocument.state === "READY" ? (
        <div className="final-document-ready">
          <FileCheck2 size={32} />
          <div>
            <h3>{matterType === "RTI" ? "Structured RTI PDF" : "Advocate-reviewed PDF"}</h3>
            <p className="muted small">
              Generated {new Date(finalDocument.generatedAt).toLocaleDateString("en-IN")}
              {` · ${Math.max(1, Math.ceil(finalDocument.sizeBytes / 1024))} KB`}
            </p>
          </div>
          <a className="button primary" href={finalDocument.downloadUrl}>
            <Download size={17} /> Download PDF
          </a>
        </div>
      ) : (
        <div className="draft-state">
          <LoaderCircle className={pending ? "spin" : ""} size={24} />
          <h3>Final PDF generation is pending</h3>
          <p>Your approved draft is safe. You can restart final formatting here.</p>
          <form action={action}>
            <button className="button outline" disabled={pending}>
              <RefreshCw className={pending ? "spin" : ""} size={16} />
              {pending ? "Formatting…" : "Prepare final PDF"}
            </button>
          </form>
        </div>
      )}
      {finalDocument.state === "READY" &&
        finalDocument.deliveryStatus === "SENT" && (
          <p className="final-delivery-note"><MailCheck size={16} /> A secure dashboard link was emailed to you.</p>
        )}
      {finalDocument.state === "READY" &&
        finalDocument.deliveryStatus === "SKIPPED_CONFIGURATION" && (
          <p className="field-note">Email delivery is not configured locally. Your PDF is ready to download here.</p>
        )}
      {finalDocument.state === "READY" &&
        finalDocument.deliveryStatus === "FAILED" && (
          <p className="field-note">The email could not be delivered, but your PDF is ready here.</p>
        )}
      {state.error && <p className="message error">{state.error}</p>}
      {state.success && <p className="message success">{state.success}</p>}
    </section>
  );
}
