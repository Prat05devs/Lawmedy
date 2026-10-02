"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";

const links = [
  { id: "services", label: "Services" },
  { id: "how", label: "How it works" },
  { id: "documents", label: "Documents" },
  { id: "under-the-hood", label: "Under the hood" },
  { id: "advocates", label: "For advocates" },
  { id: "faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    links.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <header className={`lp-nav-wrap ${scrolled ? "is-scrolled" : ""}`}>
      <div className="lp-nav">
        <Brand href="/" />
        <nav className="lp-nav-links" aria-label="Primary">
          {links.map((link) => (
            <a key={link.id} href={`#${link.id}`} className={active === link.id ? "active" : ""}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lp-nav-actions">
          <Link href="/login" className="lp-link">Log in</Link>
          <Link href="/signup" className="button gold lp-cta">Get started</Link>
        </div>
        <button className="lp-burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="lp-menu">
          {links.map((link) => (
            <a key={link.id} href={`#${link.id}`} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="button gold">Get started</Link>
        </div>
      )}
    </header>
  );
}
