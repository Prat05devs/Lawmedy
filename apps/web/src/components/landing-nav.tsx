"use client";
import Link from "next/link";
import { Menu, MessageCircle } from "lucide-react";
import { AccountMenu, deskFor, type MenuUser } from "@/components/account-menu";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { whatsappDisplay, whatsappLink } from "@/lib/site";

const links = [
  { href: "/#usecases", label: "Use cases" },
  { href: "/#services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/#questions", label: "Questions" },
];

// Logo for each theme; CSS shows the one that matches.
function Logo() {
  return (
    <Link href="/" className="lx-logo" aria-label="Lawmedy home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lx-logo-day" src="/images/brand/logo-dark.png" alt="Lawmedy" width={1460} height={390} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lx-logo-night" src="/images/brand/logo-light.png" alt="" width={1460} height={390} />
    </Link>
  );
}

// The public site's top bar: frosted, sticky, with the day/night switch.
export function LandingNav({ user }: { user?: MenuUser | null }) {
  return (
    <header className="lx-nav">
      <div className="lx-wrap lx-nav-in">
        <Logo />
        <nav className="lx-navlinks" aria-label="Primary">
          {links.map((l) => <a key={l.href} href={l.href} className="lx-navlink">{l.label}</a>)}
        </nav>
        <div className="lx-nav-actions">
          <ThemeToggle />
          {user ? (
            <span className="lx-desk-only"><AccountMenu user={user} /></span>
          ) : (
            <>
              <Link href="/login" className="lx-navlink lx-desk-only">Log in</Link>
              <Link href="/signup" className="lx-btn lx-btn-primary lx-desk-only">Get started</Link>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <button type="button" className="lx-mode lx-phone-only" aria-label="Open menu"><Menu aria-hidden /></button>
            </SheetTrigger>
            <SheetContent side="right" className="lx-sheet w-[min(320px,85vw)] gap-0 p-6">
              <SheetTitle className="mb-4">Menu</SheetTitle>
              <nav className="grid gap-1" aria-label="Mobile">
                {links.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <a href={l.href} className="lx-sheet-link">{l.label}</a>
                  </SheetClose>
                ))}
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="lx-sheet-link">
                  <MessageCircle aria-hidden /> WhatsApp {whatsappDisplay}
                </a>
              </nav>
              <div className="mt-6 grid gap-3">
                {user ? (
                  <Link href={deskFor(user.role)} className="lx-btn lx-btn-primary">Go to dashboard</Link>
                ) : (
                  <>
                    <Link href="/signup" className="lx-btn lx-btn-primary">Get started</Link>
                    <Link href="/login" className="lx-btn lx-btn-quiet">Log in</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="lx-foot">
      <div className="lx-wrap">
        <div className="lx-foot-grid">
          <div>
            <Logo />
            <p>Lawmedy helps you prepare documents. It is not a substitute for legal advice on complex disputes.</p>
          </div>
          <nav aria-label="Product">
            <h4>Product</h4>
            {links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <nav aria-label="Company">
            <h4>Company</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/contact">Contact</Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp {whatsappDisplay}</a>
            <Link href="/delete-account">Delete account</Link>
          </nav>
        </div>
        <p className="lx-copy">© {new Date().getFullYear()} Lawmedy</p>
      </div>
    </footer>
  );
}
