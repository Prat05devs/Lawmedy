"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { retryEvidence, uploadEvidence } from "@/lib/actions";
import type { EvidenceItem } from "@/lib/api";

export function EvidencePanel({
  matterId,
  evidence,
  readOnly,
}: {
  matterId: string;
  evidence: EvidenceItem[];
  readOnly: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    uploadEvidence.bind(null, matterId),
    {},
  );
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section className="panel evidence-panel">
      <div className="panel-heading">
        <span className="step-number">03</span>
        <div>
          <h2>Add supporting documents</h2>
          <p className="muted small">
            Upload payment records, conversations, receipts, or agreements.
          </p>
        </div>
      </div>
      {!readOnly && (
        <form ref={formRef} action={action} className="evidence-upload">
          <label className="file-drop">
            <Upload size={24} />
            <span>
              <strong>Choose a private file</strong>
              <small>PDF, JPG, PNG, or WebP · up to 10 MB</small>
            </span>
            <input
              type="file"
              name="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              disabled={pending}
            />
          </label>
          <button className="button primary" disabled={pending}>
            {pending ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ShieldCheck size={17} />
            )}
            {pending ? "Uploading…" : "Upload securely"}
          </button>
          {state.error && (
            <p className="message error" role="alert">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="message success" role="status">
              {state.success}
            </p>
          )}
        </form>
      )}
      {evidence.length > 0 ? (
        <div className="evidence-list" aria-live="polite">
          {evidence.map((item) => (
            <EvidenceCard key={item.id} item={item} readOnly={readOnly} />
          ))}
        </div>
      ) : (
        <p className="evidence-empty muted">
          No supporting documents uploaded yet. This step is optional.
        </p>
      )}
      <p className="field-note evidence-private-note">
        Files are private and can only be opened while you are signed in using a
        short-lived link.
      </p>
    </section>
  );
}

function EvidenceCard({
  item,
  readOnly,
}: {
  item: EvidenceItem;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(
    retryEvidence.bind(null, item.matterId, item.id),
    {},
  );
  const query = new URL(item.viewUrl, "http://private.local").search;
  const href = `/evidence/${encodeURIComponent(item.matterId)}/${encodeURIComponent(item.id)}${query}`;
  const result = item.extraction?.extraction;
  return (
    <article className="evidence-card">
      <div className="evidence-file-row">
        <span className="evidence-icon">
          {item.mimeType === "application/pdf" ? (
            <FileText size={20} />
          ) : (
            <FileImage size={20} />
          )}
        </span>
        <div className="evidence-name">
          <strong>{item.originalFilename}</strong>
          <small>{formatBytes(item.sizeBytes)}</small>
        </div>
        <Status status={item.status} />
        <a
          className="evidence-view"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          <Eye size={15} /> View
        </a>
      </div>
      {item.status === "PROCESSED" && result?.summary && (
        <div className="evidence-result">
          <span className="intake-category">
            {result.documentType?.toLowerCase().replaceAll("_", " ")}
          </span>
          <p>{result.summary}</p>
          {!!result.facts?.length && (
            <dl>
              {result.facts.map((fact, index) => (
                <div key={`${fact.field}-${index}`}>
                  <dt>{fact.field.replaceAll("_", " ")}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
      {item.status === "FAILED" && (
        <div className="evidence-failed">
          <p>{item.statusMessage}</p>
          {!readOnly && (
            <form action={action}>
              <button className="text-button" disabled={pending}>
                <RefreshCw className={pending ? "spin" : ""} size={14} />
                {pending ? "Retrying…" : "Retry extraction"}
              </button>
            </form>
          )}
          {state.error && <p className="small error-text">{state.error}</p>}
        </div>
      )}
    </article>
  );
}

function Status({ status }: { status: EvidenceItem["status"] }) {
  if (status === "PROCESSING")
    return (
      <span className="evidence-status processing">
        <LoaderCircle className="spin" size={13} /> Processing
      </span>
    );
  if (status === "PROCESSED")
    return (
      <span className="evidence-status processed">
        <CheckCircle2 size={13} /> Processed
      </span>
    );
  return (
    <span className="evidence-status failed">
      <XCircle size={13} /> Failed
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
