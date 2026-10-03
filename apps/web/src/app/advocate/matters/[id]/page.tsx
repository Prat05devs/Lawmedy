import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError, date, statusLabel } from "@/lib/api";
import type { AdvocateMatterDetail } from "@/lib/advocate-types";
import { AdvocateReviewActions } from "@/components/advocate-review";

export const metadata = { title: "Advocate matter review" };

export default async function AdvocateMatterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let detail: AdvocateMatterDetail;
  try {
    detail = await api<AdvocateMatterDetail>(
      `/advocate/matters/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) notFound();
    throw error;
  }
  const matter = detail.matter;
  const document = matter.documents[0];
  const qaVersion = document?.versions.find((version) => version.qa);
  return (
    <>
      <Link href="/advocate" className="back-link"><ArrowLeft size={16} /> Review queue</Link>
      <div className="page-heading matter-heading">
        <div>
          <p className="eyebrow">{matter.referenceNumber}</p>
          <h1>{matter.user.fullName}</h1>
          <p className="eyebrow">{matter.type === "RTI" ? "RTI APPLICATION" : "LEGAL NOTICE"}</p>
          <p className="muted">{matter.user.email} · Assigned {date(detail.assignedAt)}</p>
        </div>
        <span className={`badge ${matter.status.toLowerCase()}`}><span /> {statusLabel[matter.status]}</span>
      </div>
      <div className="advocate-case-grid">
        <div className="advocate-case-materials">
          <section className="panel">
            <div className="section-heading"><h2><FileText size={18} /> Original statement</h2></div>
            <p className="saved-statement">
              {matter.statements[0]?.statement || "No statement was recorded."}
            </p>
          </section>
          <section className="panel">
            <div className="section-heading"><h2><CheckCircle2 size={18} /> Confirmed facts</h2></div>
            <dl className="advocate-facts">
              {matter.caseFacts.map((fact) => (
                <div key={fact.id}>
                  <dt>{fact.type.replaceAll("_", " ")}</dt>
                  <dd>{fact.value.text || "—"}</dd>
                </div>
              ))}
            </dl>
            {matter.rtiDetail && (
              <div className="advocate-recipient">
                <h3>Public authority</h3>
                <p><strong>{matter.rtiDetail.publicAuthority.name}</strong><br />{matter.rtiDetail.department}<br />{matter.rtiDetail.publicAuthority.address}</p>
                <small>{matter.rtiDetail.governmentLevel.toLowerCase()}{matter.rtiDetail.state ? ` · ${matter.rtiDetail.state}` : ""}</small>
              </div>
            )}
            {(matter.applicantAddress || matter.applicantPhone) && (
              <div className="advocate-recipient">
                <h3>Applicant contact</h3>
                <p className="pre-wrap">{matter.applicantAddress}</p>
                {matter.applicantPhone && <small>{matter.applicantPhone}</small>}
              </div>
            )}
            {matter.recipient && (
              <div className="advocate-recipient">
                <h3>Recipient</h3>
                <p><strong>{matter.recipient.name}</strong><br />{matter.recipient.address}</p>
                {(matter.recipient.phone || matter.recipient.email) && (
                  <small>{[matter.recipient.phone, matter.recipient.email].filter(Boolean).join(" · ")}</small>
                )}
              </div>
            )}
          </section>
          <section className="panel">
            <div className="section-heading"><h2><ShieldCheck size={18} /> Supporting evidence</h2></div>
            {matter.evidence.length ? (
              <div className="advocate-evidence-list">
                {matter.evidence.map((item) => (
                  <Link
                    href={`/advocate/evidence/${matter.id}/${item.id}`}
                    target="_blank"
                    key={item.id}
                  >
                    <FileText size={17} />
                    <span>
                      <strong>{item.originalFilename}</strong>
                      <small>{item.extraction?.extraction.summary || item.status}</small>
                    </span>
                    <ExternalLink size={14} />
                  </Link>
                ))}
              </div>
            ) : <p className="muted small">No evidence was uploaded.</p>}
          </section>
          <section className="panel">
            <div className="section-heading"><h2><AlertTriangle size={18} /> AI quality check</h2></div>
            {qaVersion?.qa ? (
              <div className="qa-review">
                <p className={qaVersion.qa.passed ? "message success" : "message payment-pending"}>
                  {qaVersion.qa.passed ? "The automated QA pass found no blocking issues." : "The automated QA pass flagged items for review."}
                </p>
                {qaVersion.qa.issues.map((issue, index) => (
                  <div className="qa-issue" key={`${issue.code}-${index}`}>
                    <strong>{issue.code.replaceAll("_", " ")}</strong>
                    <p>{issue.description}</p>
                  </div>
                ))}
                {qaVersion.qa.warnings.map((warning, index) => <p className="qa-warning" key={index}>{warning}</p>)}
              </div>
            ) : <p className="muted small">No QA result is attached to the current case.</p>}
          </section>
          {matter.questions.length > 0 && (
            <section className="panel">
              <div className="section-heading"><h2><MessageSquareText size={18} /> Information requests</h2></div>
              <div className="request-history">
                {matter.questions.map((question) => (
                  <div className="request-thread" key={question.id}>
                    <p>{question.question}</p>
                    {question.answer ? (
                      <div className="request-answer"><CheckCircle2 size={14} /> {question.answer.answer}</div>
                    ) : <small className="muted">Waiting for user</small>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="advocate-review-column">
          <AdvocateReviewActions detail={detail} />
        </div>
      </div>
    </>
  );
}
