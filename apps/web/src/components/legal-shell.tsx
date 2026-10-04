import Link from "next/link";
import { Brand } from "@/components/brand";
import { site } from "@/lib/site";
import { getOptionalUser } from "@/lib/api";
import { AccountMenu } from "@/components/account-menu";
import "@/app/landing.css";

const links = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact & support" },
  { href: "/delete-account", label: "Delete account" },
];

export async function LegalShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  const user = await getOptionalUser();
  return (
    <div className="site">
      <header className="site-bar">
        <Brand href="/" tone="dark" />
        <nav aria-label="Site">
          {user ? <AccountMenu user={user} /> : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="button primary">Get started</Link>
            </>
          )}
        </nav>
      </header>
      <main className="site-main">
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
