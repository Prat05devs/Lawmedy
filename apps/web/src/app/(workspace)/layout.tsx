import Link from "next/link";
import { LayoutDashboard, LogOut, LockKeyhole, Plus } from "lucide-react";
import { api, User } from "@/lib/api";
import { logout } from "@/lib/actions";
import { Brand } from "@/components/brand";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await api<User>("/users/me");
  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav>
          <Link className="nav-item" href="/dashboard">
            <LayoutDashboard size={18} /> My matters
          </Link>
          <Link className="nav-item secondary" href="/matters/new">
            <Plus size={18} /> New legal notice
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <LockKeyhole size={20} />
            <strong>Your story stays yours.</strong>
            <p>
              Your matters are private and accessible only through your account.
            </p>
          </div>
          <div className="profile">
            <span className="avatar">{initials}</span>
            <span className="profile-name">
              <strong>{user.fullName}</strong>
              <small>Personal account</small>
            </span>
            <form action={logout}>
              <button
                className="icon-button"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>Personal workspace</span>
          <span className="private-label">
            <span /> Private & secure
          </span>
        </header>
        <main className="main-content">{children}</main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} Lawmedy</span>
          <span>A clearer way forward.</span>
        </footer>
      </div>
    </div>
  );
}
