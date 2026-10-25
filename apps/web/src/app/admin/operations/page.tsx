import Link from "next/link";
import { api } from "@/lib/api";
type Metrics = { uptimeSeconds: number; requests: number; failedRequests: number; activeRequests: number; peakActiveRequests: number; p95UpperBoundMs: number | null; rssBytes: number; heapUsedBytes: number; scope: string };
export default async function OperationsPage() {
  const m = await api<Metrics>("/admin/operations");
  return <>
    <div className="page-heading"><div><h1>API operations</h1><p className="muted">A snapshot of the running API. Reload to update.</p></div><Link href="/admin/operations" prefetch={false} className="button outline">Refresh</Link></div>
    <section className="panel"><dl className="admin-dl">
      <div><dt>Uptime</dt><dd>{Math.floor(m.uptimeSeconds / 60)} minutes</dd></div>
      <div><dt>Handled requests</dt><dd>{m.requests}</dd></div>
      <div><dt>Failed requests</dt><dd>{m.failedRequests}</dd></div>
      <div><dt>Active / peak requests</dt><dd>{m.activeRequests} / {m.peakActiveRequests}</dd></div>
      <div><dt>95th percentile latency, upper bound</dt><dd>{m.requests ? m.p95UpperBoundMs === null ? "Over 15 seconds" : `${m.p95UpperBoundMs} ms` : "No requests yet"}</dd></div>
      <div><dt>Process memory / heap used</dt><dd>{Math.round(m.rssBytes / 1024 / 1024)} / {Math.round(m.heapUsedBytes / 1024 / 1024)} MB</dd></div>
    </dl><p className="field-note">{m.scope}. Counts cover requests that passed the API guards. Failed requests include validation and application errors. Health checks and this snapshot are included.</p></section>
    <p className="muted">The launch setup uses one API instance. Check VPS CPU, memory, disk and PostgreSQL alongside these numbers before increasing traffic.</p>
  </>;
}
