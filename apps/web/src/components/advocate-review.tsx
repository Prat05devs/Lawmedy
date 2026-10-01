"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle, MessageSquarePlus, Save } from "lucide-react";
import type { AdvocateMatterDetail } from "@/lib/advocate-types";
import {
  approveAdvocateDraft,
  requestAdvocateInformation,
  saveAdvocateDraft,
} from "@/lib/advocate-actions";

export function AdvocateReviewActions({ detail }: { detail: AdvocateMatterDetail }) {
  const document = detail.matter.documents[0];
  const version = document?.versions[0];
  const editable =
    detail.matter.status === "UNDER_ADVOCATE_REVIEW" ||
    detail.matter.status === "USER_RESPONSE_REQUIRED";
  if (!version) return <p className="message error">No draft is available.</p>;
  return (
    <div className="advocate-action-stack">
      <DraftEditForm
        matterId={detail.matter.id}
        version={version}
        editable={editable}
      />
      {detail.matter.status === "UNDER_ADVOCATE_REVIEW" && (
        <div className="advocate-decision-grid">
          <InformationRequestForm matterId={detail.matter.id} />
          <ApprovalForm matterId={detail.matter.id} />
        </div>
      )}
      {detail.matter.status === "USER_RESPONSE_REQUIRED" && (
        <p className="message payment-pending">
          Waiting for the user’s response. You can still save draft edits.
        </p>
      )}
      {detail.matter.status === "APPROVED" && (
        <p className="message success">
          <CheckCircle2 size={18} /> This draft is approved.
        </p>
      )}
    </div>
  );
}

function DraftEditForm({
  matterId,
  version,
  editable,
}: {
  matterId: string;
  version: AdvocateMatterDetail["matter"]["documents"][number]["versions"][number];
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveAdvocateDraft.bind(null, matterId),
    {},
  );
  const content = version.content;
  return (
    <form action={action} className="panel advocate-draft-form form-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CURRENT VERSION {version.versionNumber}</p>
          <h2>Review and edit the draft</h2>
        </div>
        <span className="badge under_advocate_review"><span /> {version.createdByType.toLowerCase()}</span>
      </div>
      <input type="hidden" name="expectedVersion" value={version.versionNumber} />
      <input type="hidden" name="paragraphCount" value={content.paragraphs.length} />
      <div className="recipient-grid">
        <label>
          Sender name
          <input name="senderName" defaultValue={content.sender.name} required disabled={!editable} />
        </label>
        <label>
          Sender address
          <input name="senderAddress" defaultValue={content.sender.address ?? ""} disabled={!editable} />
        </label>
        <label>
          Recipient name
          <input name="recipientName" defaultValue={content.recipient.name} required disabled={!editable} />
        </label>
        <label>
          Recipient address
          <input name="recipientAddress" defaultValue={content.recipient.address ?? ""} disabled={!editable} />
        </label>
      </div>
      <label>
        Subject
        <input name="subject" defaultValue={content.subject} required maxLength={1000} disabled={!editable} />
      </label>
      <div className="advocate-paragraphs">
        <h3>Notice paragraphs</h3>
        {content.paragraphs.map((paragraph, index) => (
          <label key={index}>
            Paragraph {index + 1}
            <textarea
              name={`paragraph:${index}`}
              defaultValue={paragraph.text}
              rows={5}
              maxLength={10000}
              required
              disabled={!editable}
            />
            <span className="field-note">
              Supported by {paragraph.caseFactIds.length} confirmed fact reference(s).
            </span>
          </label>
        ))}
      </div>
      <label>
        Demand
        <textarea name="demand" defaultValue={content.demand} rows={4} required disabled={!editable} />
      </label>
      <label>
        Response period
        <input name="responsePeriod" defaultValue={content.responsePeriod} required disabled={!editable} />
      </label>
      {editable && (
        <button className="button primary" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
          {pending ? "Saving…" : "Save as new version"}
        </button>
      )}
      <Messages state={state} />
    </form>
  );
}

function InformationRequestForm({ matterId }: { matterId: string }) {
  const [state, action, pending] = useActionState(
    requestAdvocateInformation.bind(null, matterId),
    {},
  );
  return (
    <form action={action} className="panel form-stack">
      <h3>Request more information</h3>
      <p className="muted small">The user will receive this inside Lawmedy.</p>
      <textarea name="question" rows={5} minLength={3} maxLength={5000} required />
      <button className="button outline" disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={16} /> : <MessageSquarePlus size={16} />}
        {pending ? "Sending…" : "Send request"}
      </button>
      <Messages state={state} />
    </form>
  );
}

function ApprovalForm({ matterId }: { matterId: string }) {
  const [state, action, pending] = useActionState(
    approveAdvocateDraft.bind(null, matterId),
    {},
  );
  return (
    <form action={action} className="panel form-stack approval-panel">
      <h3>Approve final draft</h3>
      <p className="muted small">Approval records your identity and review time.</p>
      <label className="confirm-check">
        <input type="checkbox" name="confirmed" required />
        <span>I reviewed the full case and approve this draft.</span>
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
        {pending ? "Approving…" : "Approve draft"}
      </button>
      <Messages state={state} />
    </form>
  );
}

function Messages({ state }: { state: { error?: string; success?: string } }) {
  return (
    <>
      {state.error && <p className="message error">{state.error}</p>}
      {state.success && <p className="message success">{state.success}</p>}
    </>
  );
}
