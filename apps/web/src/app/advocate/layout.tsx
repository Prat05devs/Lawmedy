import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, LogOut, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { api, type User } from "@/lib/api";
import { logout } from "@/lib/actions";

export default async function AdvocateLayout({ children }: { children: React.ReactNode }) {
  const user = await api<User>("/users/me");
  if (user.role !== "ADVOCATE") redirect("/dashboard");
  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="workspace advocate-workspace">
      <aside className="sidebar">
        <Brand href="/advocate" />
        <p className="nav-label">ADVOCATE WORKSPACE</p>
        <nav>
          <Link className="nav-item" href="/advocate">
            <BriefcaseBusiness size={18} /> Assigned matters
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={20} />
            <strong>Confidential review.</strong>
            <p>Access is limited to matters assigned to your advocate account.</p>
          </div>
          <div className="profile">
            <span className="avatar">{initials}</span>
            <span className="profile-name">
              <strong>{user.fullName}</strong>
              <small>Advocate account</small>
            </span>
            <form action={logout}>
              <button className="icon-button" aria-label="Log out" title="Log out">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>Advocate review workspace</span>
          <span className="private-label"><span /> Role protected</span>
        </header>
        <main className="main-content">{children}</main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} Lawmedy</span>
          <span>Human review, recorded clearly.</span>
        </footer>
      </div>
    </div>
  );
}
