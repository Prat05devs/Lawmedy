import Link from "next/link";
import { Brand } from "@/components/brand";
import { site } from "@/lib/site";

const links = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact & support" },
  { href: "/delete-account", label: "Delete account" },
];

export function LegalShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="site-bar">
        <Brand href="/" />
        <nav aria-label="Site">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="button gold">Get started</Link>
        </nav>
      </header>
      <main className="site-main">
        <p className="eyebrow">LAWMEDY</p>
        <h1>{title}</h1>
        {intro && <p className="site-intro">{intro}</p>}
        <p className="site-updated">Last updated {site.updated}</p>
        <div className="site-prose">{children}</div>
      </main>
      <footer className="site-foot">
        <Brand href="/" />
        <nav aria-label="Legal">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        <p>Lawmedy helps you prepare documents. It is not a substitute for legal advice on complex disputes. © {new Date().getFullYear()} Lawmedy</p>
      </footer>
    </div>
  );
}
