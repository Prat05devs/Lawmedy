"use client";
import Link from "next/link";
import { Menu, MessageCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { AccountMenu, deskFor, type MenuUser } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { whatsappDisplay, whatsappLink } from "@/lib/site";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#situations", label: "Situations" },
  { href: "#price", label: "Services & prices" },
  { href: "#questions", label: "Questions" },
];

// Robe-black header for the home page.
export function LandingNav({ user }: { user?: MenuUser | null }) {
  return (
    <header className="lp-header sticky top-0 z-20 border-b border-white/10 bg-robe text-white">
      <div className="mx-auto flex max-w-[1120px] items-center gap-8 px-6 py-3">
        <Brand href="/" tone="light" />
        <nav className="hidden gap-6 text-[15px] lg:flex" aria-label="Primary">
          {links.map((l) => <a key={l.href} href={l.href} className="text-white/75 hover:text-white">{l.label}</a>)}
        </nav>
        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/85 hover:border-white/50 hover:text-white">
            <MessageCircle className="size-4" aria-hidden /> WhatsApp us
          </a>
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <>
              <Link href="/login" className="text-[15px] text-white/85 hover:text-white">Log in</Link>
              <Button asChild className="bg-genda font-semibold text-robe hover:bg-genda/90"><Link href="/signup">Get started</Link></Button>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto text-white hover:bg-white/10 hover:text-white lg:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(320px,85vw)] gap-0 bg-robe p-6 text-white">
            <SheetTitle className="mb-4 text-white">Menu</SheetTitle>
            <nav className="grid gap-1" aria-label="Mobile">
              {links.map((l) => (
                <SheetClose asChild key={l.href}>
                  <a href={l.href} className="rounded-md px-2 py-3 text-base text-white/85 hover:bg-white/10 hover:text-white">{l.label}</a>
                </SheetClose>
              ))}
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md px-2 py-3 text-base text-white/85 hover:bg-white/10">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp {whatsappDisplay}
              </a>
            </nav>
            <div className="mt-6 grid gap-3">
              {user ? (
                <Button asChild className="h-11 bg-genda text-robe hover:bg-genda/90"><Link href={deskFor(user.role)}>Go to dashboard</Link></Button>
              ) : (
                <>
                  <Button asChild className="h-11 bg-genda font-semibold text-robe hover:bg-genda/90"><Link href="/signup">Get started</Link></Button>
                  <Button asChild variant="outline" className="h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/login">Log in</Link></Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
