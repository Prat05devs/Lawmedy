import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Package } from "lucide-react";
import { api, ApiError, date, statusLabel, type Matter } from "@/lib/api";
import { AssignForm, PaymentActions } from "@/components/admin-forms";

type Json = Record<string, unknown>;
type Detail = {
  id: string; referenceNumber: string; type: Matter["type"]; status: Matter["status"]; createdAt: string;
  applicantAddress: string | null; applicantPhone: string | null;
  user: { id: string; fullName: string; email: string; createdAt: string };
  statements: { id: string; statement: string; createdAt: string }[];
  questions: { id: string; question: string; requestedByAdvocate: { fullName: string } | null; answer: { answer: string } | null }[];
  caseFacts: { id: string; type: string; value: Json; source: string; confirmedByUser: boolean }[];
  recipient: { name: string; address: string; phone: string | null; email: string | null } | null;
  rtiDetail: { subject: string; department: string; governmentLevel: string; state: string | null; periodFrom: string | null; periodTo: string | null; publicAuthority: { name: string; address: string } } | null;
  evidence: { id: string; originalFilename: string; mimeType: string; sizeBytes: number; status: string; createdAt: string; extraction: { extraction: Json } | null }[];
  payments: { id: string; status: string; amount: number; currency: string; providerPaymentId: string | null; submittedAt: string | null; paidAt: string | null; reviewNote: string | null }[];
  documents: { versions: { versionNumber: number; content: Json; createdByType: string; createdAt: string }[] }[];
  finalDocument: { filename: string; sizeBytes: number; generatedAt: string } | null;
  assignment: { advocateId: string; status: string; advocate: { fullName: string; email: string } } | null;
  timeline: { id: string; action: string; actorType: string; createdAt: string }[];
};
type Adv = { id: string; fullName: string; active: boolean; open: number };

const money = (p: number, c: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(p / 100);
const kb = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(b / 1024))} KB`);
const label = (t: string) => t.replace(/[_:]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const factText = (v: Json) => (typeof v.text === "string" ? v.text : JSON.stringify(v));

export default async function AdminMatter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let m: Detail;
  try { m = await api<Detail>(`/admin/matters/${encodeURIComponent(id)}`); }
  catch (e) { if (e instanceof ApiError && [400, 404].includes(e.status)) notFound(); throw e; }
  const advocates = (await api<Adv[]>("/admin/advocates")).filter((a) => a.active);
  const payment = m.payments[0];
  const version = m.documents[0]?.versions[0];
  const content = (version?.content ?? null) as Json | null;
  const paragraphs = (content?.paragraphs as { text: string }[] | undefined) ?? [];
  const requests = (content?.informationRequests as { text: string }[] | undefined) ?? [];
  const canAssign = ["DRAFT_GENERATED", "UNDER_ADVOCATE_REVIEW", "USER_RESPONSE_REQUIRED"].includes(m.status);

  return (
    <>
      <Link href="/admin/matters" className="back-link"><ArrowLeft size={16} /> All matters</Link>
      <div className="page-heading matter-heading">
        <div>
          <p className="eyebrow">{m.referenceNumber}</p>
          <h1>{m.type === "RTI" ? "RTI application" : "Legal notice"}</h1>
          <p className="muted">Started {date(m.createdAt)}</p>
        </div>
        <span className={`badge ${m.status.toLowerCase()}`}><span />{statusLabel[m.status]}</span>
      </div>

      <section className="panel">
        <h2>Customer</h2>
        <dl className="admin-dl">
          <div><dt>Name</dt><dd>{m.user.fullName}</dd></div>
          <div><dt>Email</dt><dd><a href={`mailto:${m.user.email}`}>{m.user.email}</a></dd></div>
          <div><dt>Phone</dt><dd>{m.applicantPhone || "Not given"}</dd></div>
          <div><dt>Postal address</dt><dd className="pre-wrap">{m.applicantAddress || "Not given"}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <h2>Payment</h2>
        {!payment ? <p className="muted">No payment has been made yet.</p> : (
          <>
            <dl className="admin-dl">
              <div><dt>Status</dt><dd><span className={`pill ${payment.status === "PAID" ? "ok" : payment.status === "SUBMITTED" ? "warn" : "off"}`}>{payment.status}</span></dd></div>
              <div><dt>Amount</dt><dd>{money(payment.amount, payment.currency)}</dd></div>
              <div><dt>User's reference</dt><dd className="mono">{payment.providerPaymentId}</dd></div>
              <div><dt>Submitted</dt><dd>{payment.submittedAt ? date(payment.submittedAt) : "-"}</dd></div>
              {payment.reviewNote && <div><dt>Note</dt><dd>{payment.reviewNote}</dd></div>}
            </dl>
            {payment.status === "SUBMITTED" && <PaymentActions paymentId={payment.id} matterId={m.id} amount={money(payment.amount, payment.currency)} reference={payment.providerPaymentId ?? ""} />}
          </>
        )}
      </section>

      <section className="panel">
        <h2>Advocate</h2>
        {m.assignment ? <p>Assigned to <strong>{m.assignment.advocate.fullName}</strong> ({m.assignment.advocate.email}) · {label(m.assignment.status.toLowerCase())}</p> : <p className="muted">Not assigned yet.{canAssign ? "" : " Assignment opens once the draft is ready."}</p>}
        {canAssign && <AssignForm matterId={m.id} advocates={advocates} current={m.assignment?.advocateId} />}
      </section>

      <section className="panel">
        <h2>What the user wrote</h2>
        {m.statements.map((s, i) => (
          <div key={s.id} className="admin-quote">
            <small>{m.statements.length > 1 ? `Version ${i + 1} · ` : ""}{date(s.createdAt)}</small>
            <p className="pre-wrap">{s.statement}</p>
          </div>
        ))}
        {m.statements.length === 0 && <p className="muted">No statement yet.</p>}
        {m.questions.length > 0 && <h3>Questions and answers</h3>}
        {m.questions.map((q) => (
          <div key={q.id} className="admin-qa">
            <strong>{q.question}</strong><small>{q.requestedByAdvocate ? `Asked by ${q.requestedByAdvocate.fullName}` : "Asked by Lawmedy"}</small>
            <p className="pre-wrap">{q.answer?.answer ?? <span className="muted">Not answered</span>}</p>
          </div>
        ))}
      </section>

      {m.rtiDetail && (
        <section className="panel">
          <h2>RTI request</h2>
          <dl className="admin-dl">
            <div><dt>Authority</dt><dd>{m.rtiDetail.publicAuthority.name}</dd></div>
            <div><dt>Department</dt><dd>{m.rtiDetail.department}</dd></div>
            <div><dt>Level</dt><dd>{label(m.rtiDetail.governmentLevel.toLowerCase())}{m.rtiDetail.state ? ` · ${m.rtiDetail.state}` : ""}</dd></div>
            <div><dt>Subject</dt><dd>{m.rtiDetail.subject}</dd></div>
            <div><dt>Period</dt><dd>{m.rtiDetail.periodFrom ? date(m.rtiDetail.periodFrom) : "-"} to {m.rtiDetail.periodTo ? date(m.rtiDetail.periodTo) : "-"}</dd></div>
          </dl>
        </section>
      )}
      {m.recipient && (
        <section className="panel">
          <h2>Other party</h2>
          <dl className="admin-dl">
            <div><dt>Name</dt><dd>{m.recipient.name}</dd></div>
            <div><dt>Address</dt><dd className="pre-wrap">{m.recipient.address}</dd></div>
            <div><dt>Phone</dt><dd>{m.recipient.phone || "-"}</dd></div>
            <div><dt>Email</dt><dd>{m.recipient.email || "-"}</dd></div>
          </dl>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <h2>Attachments ({m.evidence.length})</h2>
          {m.evidence.length > 0 && <a className="button gold" href={`/admin/files/${m.id}/zip`}><Package size={16} /> Download all (zip)</a>}
        </div>
        {m.evidence.length === 0 && <p className="muted">The user attached no files.</p>}
        <div className="evidence-grid">
          {m.evidence.map((e) => {
            const image = e.mimeType.startsWith("image/");
            const summary = (e.extraction?.extraction as Json | undefined)?.summary;
            return (
              <article key={e.id} className="evidence-card">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={`/admin/files/${m.id}/${e.id}`} target="_blank" rel="noreferrer"><img src={`/admin/files/${m.id}/${e.id}`} alt={e.originalFilename} loading="lazy" /></a>
                ) : (
                  <a className="evidence-doc" href={`/admin/files/${m.id}/${e.id}`} target="_blank" rel="noreferrer"><FileText size={34} /><span>Open PDF</span></a>
                )}
                <strong title={e.originalFilename}>{e.originalFilename}</strong>
                <small>{kb(e.sizeBytes)} · {date(e.createdAt)}</small>
                {typeof summary === "string" && <p className="muted small">AI summary: {summary}</p>}
                <a className="button outline" href={`/admin/files/${m.id}/${e.id}?download=1`}><Download size={15} /> Download</a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Confirmed facts</h2>
        <div className="admin-facts">
          {m.caseFacts.map((f) => (
            <div key={f.id} className={f.confirmedByUser ? "confirmed" : ""}>
              <small>{label(f.type)} · {label(f.source.toLowerCase())}{f.confirmedByUser ? " · confirmed by user" : ""}</small>
              <span>{factText(f.value)}</span>
            </div>
          ))}
          {m.caseFacts.length === 0 && <p className="muted">No facts gathered yet.</p>}
        </div>
      </section>

      {version && (
        <section className="panel">
          <h2>Latest draft (version {version.versionNumber}, {version.createdByType.toLowerCase()})</h2>
          {typeof content?.subject === "string" && <p><strong>{content.subject}</strong></p>}
          {paragraphs.map((p, i) => <p key={i} className="pre-wrap">{p.text}</p>)}
          {requests.map((r, i) => <p key={i}>{i + 1}. {r.text}</p>)}
          {typeof content?.demand === "string" && <p><strong>Demand:</strong> {content.demand}</p>}
        </section>
      )}
      {m.finalDocument && <section className="panel"><h2>Final PDF</h2><p>{m.finalDocument.filename} · {kb(m.finalDocument.sizeBytes)} · generated {date(m.finalDocument.generatedAt)}</p></section>}

      <section className="panel">
        <h2>Activity</h2>
        <ol className="admin-timeline">
          {m.timeline.map((t) => <li key={t.id}><span>{label(t.action.toLowerCase())}</span><small>{t.actorType} · {date(t.createdAt)}</small></li>)}
        </ol>
      </section>
    </>
  );
}
