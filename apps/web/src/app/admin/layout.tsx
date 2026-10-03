import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, CreditCard, FolderOpen, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { getMe } from "@/lib/api";
import { logout } from "@/lib/actions";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe();
  if (user.role !== "ADMIN") redirect(user.role === "ADVOCATE" ? "/advocate" : "/dashboard");
  const initials = user.fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
  return (
    <div className="workspace advocate-workspace">
      <aside className="sidebar">
        <Brand href="/admin" />
        <nav>
          <Link className="nav-item" href="/admin"><LayoutDashboard size={18} /> Dashboard</Link>
          <Link className="nav-item" href="/admin/matters"><FolderOpen size={18} /> Matters</Link>
          <Link className="nav-item" href="/admin/payments"><CreditCard size={18} /> Payments</Link>
          <Link className="nav-item" href="/admin/advocates"><BriefcaseBusiness size={18} /> Advocates</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={20} />
            <strong>Confidential.</strong>
            <p>You can see everything users submit. Handle it with care.</p>
          </div>
          <div className="profile">
            <span className="avatar">{initials}</span>
            <span className="profile-name"><strong>{user.fullName}</strong><small>Administrator</small></span>
            <form action={logout}><button className="icon-button" aria-label="Log out" title="Log out"><LogOut size={18} /></button></form>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>Admin desk</span>
          <span className="private-label"><span /> Admin only</span>
        </header>
        <main className="main-content admin-main">{children}</main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} Lawmedy</span>
          <span>Handle customer information with care.</span>
        </footer>
      </div>
    </div>
  );
}
