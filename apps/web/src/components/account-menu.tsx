"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogOut, Trash2 } from "lucide-react";
import { logout } from "@/lib/actions";

export type MenuUser = { fullName: string; email: string; role: "USER" | "ADVOCATE" | "ADMIN"; createdAt?: string };
export const deskFor = (role: MenuUser["role"]) => (role === "ADMIN" ? "/admin" : role === "ADVOCATE" ? "/advocate" : "/dashboard");
const roleLabel = { USER: "Personal account", ADVOCATE: "Advocate", ADMIN: "Administrator" };

// Shown on public pages when someone is signed in: a way back to their desk, and their profile.
export function AccountMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const initials = user.fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : null;
  return (
    <div className="acct" ref={box}>
      <Link href={deskFor(user.role)} className="button primary acct-desk"><LayoutDashboard size={16} /> Go to dashboard</Link>
      <button type="button" className="acct-avatar" aria-label={`Your profile, ${user.fullName}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>{initials}</button>
      {open && (
        <div className="acct-pop" role="menu">
          <div className="acct-who">
            <span className="acct-avatar big" aria-hidden="true">{initials}</span>
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <dl className="acct-details">
            <div><dt>Account</dt><dd>{roleLabel[user.role]}</dd></div>
            {since && <div><dt>Member since</dt><dd>{since}</dd></div>}
          </dl>
          <Link href={deskFor(user.role)} role="menuitem" className="acct-item"><LayoutDashboard size={16} /> Dashboard</Link>
          <Link href="/delete-account" role="menuitem" className="acct-item"><Trash2 size={16} /> Delete my account</Link>
          <form action={logout}><button role="menuitem" className="acct-item"><LogOut size={16} /> Log out</button></form>
        </div>
      )}
    </div>
  );
}
