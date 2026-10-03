import Link from "next/link";
import { CreditCard, FolderOpen, UserCheck, Users } from "lucide-react";
import { api, statusLabel, type Matter } from "@/lib/api";

type Dash = { pendingPayments: number; activeAdvocates: number; awaitingAssignment: number; total: number; matters: Record<string, number> };

export default async function AdminDashboard() {
  const d = await api<Dash>("/admin/dashboard");
  const cards = [
    { href: "/admin/payments", label: "Payments to verify", value: d.pendingPayments, Icon: CreditCard, hot: d.pendingPayments > 0 },
    { href: "/admin/matters?status=DRAFT_GENERATED", label: "Awaiting assignment", value: d.awaitingAssignment, Icon: UserCheck, hot: d.awaitingAssignment > 0 },
    { href: "/admin/matters", label: "All matters", value: d.total, Icon: FolderOpen, hot: false },
    { href: "/admin/advocates", label: "Active advocates", value: d.activeAdvocates, Icon: Users, hot: false },
  ];
  return (
    <>
      <div className="page-heading"><div><h1>Overview</h1><p className="muted">What needs your attention right now.</p></div></div>
      <div className="admin-cards">
        {cards.map(({ href, label, value, Icon, hot }) => (
          <Link key={label} href={href} className={`admin-stat ${hot ? "hot" : ""}`}>
            <strong>{value}</strong><span>{label}</span>
          </Link>
        ))}
      </div>
      <section className="panel">
        <h2>Matters by status</h2>
        <div className="status-grid">
          {Object.entries(d.matters).sort().map(([status, count]) => (
            <Link key={status} href={`/admin/matters?status=${status}`} className="status-chip">
              <strong>{count}</strong><span>{statusLabel[status as Matter["status"]] ?? status}</span>
            </Link>
          ))}
          {!Object.keys(d.matters).length && <p className="muted">No matters yet.</p>}
        </div>
      </section>
    </>
  );
}
