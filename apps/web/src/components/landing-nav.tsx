"use client";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#documents", label: "Documents" },
  { href: "#ai", label: "Where AI is used" },
  { href: "#questions", label: "Questions" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lp-header">
      <div className="lp-header-in">
        <Brand href="/" tone="dark" />
        <nav className="lp-links" aria-label="Primary">
          {links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <div className="lp-header-cta">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="button primary">Get started</Link>
        </div>
        <button className="lp-menu-btn" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Menu"}</button>
      </div>
      {open && (
        <div className="lp-menu">
          {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="button primary">Get started</Link>
        </div>
      )}
    </header>
  );
}
