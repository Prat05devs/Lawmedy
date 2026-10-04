"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { MatterDocument } from "@/lib/api";
import { retryDocument } from "@/lib/actions";

export function DraftPanel({
  matterId,
  draft,
}: {
  matterId: string;
  draft: MatterDocument;
}) {
  const [state, action, pending] = useActionState(
    retryDocument.bind(null, matterId),
    {},
  );
  if (
    draft.matterStatus !== "PAID" &&
    draft.matterStatus !== "AI_PROCESSING" &&
    draft.matterStatus !== "DRAFT_GENERATED" &&
    draft.matterStatus !== "UNDER_ADVOCATE_REVIEW" &&
    draft.matterStatus !== "USER_RESPONSE_REQUIRED" &&
    draft.matterStatus !== "APPROVED" &&
    draft.matterStatus !== "COMPLETED"
  )
    return null;

  return (
    <section className="panel draft-panel">
      <div className="panel-heading">
        <span className="step-number">06</span>
        <div>
          <h2>Your {draft.matterType === "RTI" ? "RTI application" : "legal notice"} draft</h2>
          <p className="muted small">
            Prepared from the case information you confirmed.
          </p>
        </div>
      </div>
      {draft.state === "READY" && draft.document ? (
        <DraftPreview draft={draft.document} matterType={draft.matterType} />
      ) : draft.state === "WAITING_FOR_CONFIGURATION" ? (
        <div className="draft-state">
          <ShieldCheck size={24} />
          <h3>AI setup is pending</h3>
          <p>
            Your payment and confirmed information are safe. Draft generation
            will start again shortly. Please check back in a few minutes.
          </p>
        </div>
      ) : draft.state === "MISSING_INFORMATION" ? (
        <div className="draft-state">
          <ShieldCheck size={24} />
          <h3>More confirmed information is needed</h3>
          <p>{draft.message}</p>
        </div>
      ) : draft.state === "FAILED" ? (
        <div className="draft-state">
          <FileCheck2 size={24} />
          <h3>Your information is safe</h3>
          <p>{draft.message}</p>
          <form action={action}>
            <button className="button outline" disabled={pending}>
              {pending ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              {pending ? "Preparing…" : "Try draft generation again"}
            </button>
          </form>
        </div>
      ) : (
        <div className="draft-state processing" role="status">
          <LoaderCircle className="spin" size={24} />
          <h3>Your draft is being prepared</h3>
          <p>
            We’re generating the notice and checking every claim against your
            confirmed facts.
          </p>
        </div>
      )}
      {state.error && <p className="message error">{state.error}</p>}
    </section>
  );
}

function DraftPreview({ draft, matterType }: { draft: NonNullable<MatterDocument["document"]>; matterType: "LEGAL_NOTICE" | "RTI" }) {
  const content = draft.content;
  if ("informationRequests" in content) return (
    <div className="notice-preview"><div className="draft-ready"><CheckCircle2 size={18}/><span>Automated QA complete · Version {draft.versionNumber}. Your final RTI PDF is being prepared directly.</span></div><article><p className="notice-label">RTI APPLICATION</p><div className="notice-parties"><div><small>Applicant</small><strong>{content.applicant.name}</strong></div><div><small>Public authority</small><strong>{content.publicAuthority.name}</strong><span>{content.publicAuthority.department}</span></div></div><h3>{content.subject}</h3><ol>{content.informationRequests.map((request, index) => <li key={index}>{request.text}</li>)}</ol></article><p className="field-note">This structured draft uses only your confirmed facts and proceeds directly to the final PDF.</p></div>
  );
  return (
    <div className="notice-preview">
      <div className="draft-ready">
        <CheckCircle2 size={18} />
        <span>
          Automated QA complete · Version {draft.versionNumber}. It will now go
          to an advocate for review.
        </span>
      </div>
      <article>
        <p className="notice-label">LEGAL NOTICE</p>
        <div className="notice-parties">
          <div>
            <small>From</small>
            <strong>{content.sender.name}</strong>
            {content.sender.address && <span>{content.sender.address}</span>}
          </div>
          <div>
            <small>To</small>
            <strong>{content.recipient.name}</strong>
            {content.recipient.address && <span>{content.recipient.address}</span>}
          </div>
        </div>
        <h3>{content.subject}</h3>
        <ol>
          {content.paragraphs.map((paragraph, index) => (
            <li key={index}>{paragraph.text}</li>
          ))}
        </ol>
        <div className="notice-demand">
          <strong>Demand</strong>
          <p>{content.demand}</p>
          <small>Response requested: {content.responsePeriod}</small>
        </div>
      </article>
      <p className="field-note">
        This is a read-only AI draft. An advocate will review it before it is
        approved for delivery.
      </p>
    </div>
  );
}
