import Link from "next/link";
import { Search } from "lucide-react";
import { api, date, statusLabel, type Matter } from "@/lib/api";

type Row = { id: string; referenceNumber: string; type: Matter["type"]; status: Matter["status"]; createdAt: string; updatedAt: string;
  user: { fullName: string; email: string }; payments: { status: string; amount: number }[]; assignment: { advocate: { fullName: string } } | null; _count: { evidence: number } };

export default async function AdminMatters({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "", q = "" } = await searchParams;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  const rows = await api<Row[]>(`/admin/matters?${query}`);
  return (
    <>
      <div className="page-heading"><div><h1>Matters</h1><p className="muted">Everything users have submitted.</p></div></div>
      <form className="admin-filter" action="/admin/matters">
        <label className="search"><Search size={16} /><input name="q" defaultValue={q} placeholder="Search reference, name or email" /></label>
        <select name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <button className="button primary">Filter</button>
      </form>
      <section className="panel admin-table">
        {rows.length === 0 && <p className="muted">No matters match.</p>}
        {rows.map((m) => (
          <Link key={m.id} href={`/admin/matters/${m.id}`} className="admin-row link">
            <div><strong>{m.referenceNumber}</strong><small>{m.type === "RTI" ? "RTI application" : "Legal notice"} · {date(m.createdAt)}</small></div>
            <div><strong>{m.user.fullName}</strong><small>{m.user.email}</small></div>
            <div className="admin-stats">
              <span className={`badge ${m.status.toLowerCase()}`}><span />{statusLabel[m.status]}</span>
              {m.payments[0] && <span className={`pill ${m.payments[0].status === "PAID" ? "ok" : m.payments[0].status === "SUBMITTED" ? "warn" : "off"}`}>Payment {m.payments[0].status.toLowerCase()}</span>}
              {m._count.evidence > 0 && <span>{m._count.evidence} file{m._count.evidence > 1 ? "s" : ""}</span>}
              {m.assignment && <span>{m.assignment.advocate.fullName}</span>}
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
