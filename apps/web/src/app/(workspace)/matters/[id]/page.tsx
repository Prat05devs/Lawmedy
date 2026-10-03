import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { api, ApiError, Overview, date, statusLabel } from "@/lib/api";
import { StatementForm } from "@/components/forms";
import { IntakePanel } from "@/components/intake";
import { EvidencePanel } from "@/components/evidence";
import { ReviewPanel } from "@/components/review";
import { DraftPanel } from "@/components/document";
import { AdvocateRequestPanel } from "@/components/advocate-request";
import { FinalDocumentPanel } from "@/components/final-document";
import { RtiDetailsPanel } from "@/components/rti-details";
import { ProgressTracker } from "@/components/progress-tracker";
import { AutoRefresh } from "@/components/auto-refresh";
export const metadata = { title: "Your matter" };
export default async function MatterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const path = `/matters/${encodeURIComponent(id)}`;
  // The matter itself plus every panel's data in one API call.
  const view = await api<Overview>(`${path}/overview`).catch((error) => {
    if (error instanceof ApiError && [400, 404].includes(error.status)) notFound();
    throw error;
  });
  const { matter, intake, evidence, review, draft, advocateRequests, finalDocument, authorities, rtiDetails } = {
    ...view,
    draft: view.document,
  };
  const latest =
    matter.statements.find((statement) => statement.id === matter.currentStatementId) ??
    matter.statements[0];
  const working =
    intake?.status === "RUNNING" ||
    evidence.some((item) => item.status === "PROCESSING") ||
    draft.state === "PROCESSING" ||
    finalDocument.state === "PENDING" ||
    ["PAYMENT_VERIFICATION", "PAID", "AI_PROCESSING", "DRAFT_GENERATED", "UNDER_ADVOCATE_REVIEW", "APPROVED"].includes(matter.status);
  const editable =
    matter.status === "DRAFT" || matter.status === "INTAKE_IN_PROGRESS";
  return (
    <>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={16} /> All matters
      </Link>
      <div className="page-heading matter-heading">
        <div>
          <p className="eyebrow">{matter.referenceNumber}</p>
          <h1>
            {matter.type === "LEGAL_NOTICE"
              ? "Your legal notice"
              : "Your RTI matter"}
          </h1>
          <p className="muted">Started {date(matter.createdAt)}</p>
        </div>
        <span className={`badge ${matter.status.toLowerCase()}`}>
          <span />
          {statusLabel[matter.status]}
        </span>
      </div>
      <AutoRefresh active={working} />
      <ProgressTracker status={matter.status} />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Your side of the story</h2>
                <p className="muted small">
                  A clear account is a good place to begin.
                </p>
              </div>
            </div>
            {editable && (
              <StatementForm id={id} initial={latest?.statement || ""} matterType={matter.type} />
            )}
          </section>
          {latest && (
            <section className="panel saved-panel">
              <div className="section-heading">
                <h2>
                  <CheckCircle2 size={19} /> Saved statement
                </h2>
                <span className="small muted">{date(latest.createdAt)}</span>
              </div>
              <p className="saved-statement">{latest.statement}</p>
            </section>
          )}
          {intake && (
            <IntakePanel id={id} intake={intake} readOnly={!editable} />
          )}
          {matter.type === "RTI" && <RtiDetailsPanel matterId={id} authorities={authorities} details={rtiDetails} readOnly={!editable} />}
          <EvidencePanel
            matterId={id}
            evidence={evidence}
            readOnly={!editable}
          />
          {review && <ReviewPanel matterId={id} review={review} />}
          {draft && <DraftPanel matterId={id} draft={draft} />}
          {advocateRequests && (
            <AdvocateRequestPanel matterId={id} requests={advocateRequests} />
          )}
          {finalDocument && (
            <FinalDocumentPanel matterId={id} finalDocument={finalDocument} matterType={matter.type} />
          )}
        </div>
        <aside className="tips">
          <h3>A few helpful details</h3>
          <p>You don’t need to use legal language. Focus on what you know.</p>
          <ul>
            <li>Who was involved?</li>
            <li>What happened, and when?</li>
            <li>Were any amounts or promises involved?</li>
            <li>What outcome are you hoping for?</li>
          </ul>
          <div className="tips-foot">
            Stick to the facts. It’s okay if you don’t have every detail yet.
          </div>
        </aside>
      </div>
    </>
  );
}
