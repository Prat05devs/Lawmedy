import { LandingNav, SiteFooter } from "@/components/landing-nav";
import { site } from "@/lib/site";
import { getOptionalUser } from "@/lib/api";
import "@/app/landing.css";

// Privacy, terms, refunds, contact and account deletion share the home page's bar, footer and themes.
export async function LegalShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  const user = await getOptionalUser();
  return (
    <div className="lx">
      <LandingNav user={user} />
      <header className="lx-legal-head">
        <div className="lx-wrap">
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
          <p className="lx-updated">Last updated {site.updated}</p>
        </div>
      </header>
      <main className="lx-wrap">
        <div className="lx-prose">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
