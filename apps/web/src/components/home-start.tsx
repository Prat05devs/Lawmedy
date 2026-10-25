"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PICK_EVENT, scenarios, type Tone } from "@/lib/scenarios";

// What a visitor types on the home page is kept only in their browser until they create a
// matter, where it pre-fills the statement for them to check and save.
export const DRAFT_KEY = "lawmedy:draft-statement";

export function readDraft() {
  try { return window.localStorage.getItem(DRAFT_KEY) ?? ""; } catch { return ""; }
}
export function clearDraft() {
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}

export const toneDot: Record<Tone | "ink", string> = { genda: "bg-genda", mor: "bg-mor", rani: "bg-rani", ink: "bg-robe" };

// The hero: headline and the box on the left, the list of common situations on the right.
export function HomeStart({ signedIn, intro, footer }: { signedIn: boolean; intro: React.ReactNode; footer: React.ReactNode }) {
  const router = useRouter();
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  const pick = (example: string) => {
    setText(example);
    box.current?.focus();
  };
  // Situation links further down the page fill this box too.
  useEffect(() => {
    const onPick = (event: Event) => pick((event as CustomEvent<string>).detail);
    window.addEventListener(PICK_EVENT, onPick);
    return () => window.removeEventListener(PICK_EVENT, onPick);
  }, []);
  const start = (event: React.FormEvent) => {
    event.preventDefault();
    try { window.localStorage.setItem(DRAFT_KEY, text.trim()); } catch { /* still continue */ }
    router.push(signedIn ? "/matters/new" : "/signup");
  };

  return (
    <div className="mx-auto grid max-w-[1120px] items-start gap-8 px-6 pt-8 pb-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] lg:gap-12 lg:pt-12 lg:pb-14">
      <div className="min-w-0">
        {intro}
        <form onSubmit={start} className="rounded-xl bg-white p-4 text-foreground shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)]">
          <label htmlFor="hero-statement" className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Tell us what happened
          </label>
          <Textarea
            id="hero-statement"
            ref={box}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="For example: I lent ₹1.5 lakh to a friend in March. He promised to return it by June and now avoids my calls."
            rows={3}
            maxLength={5000}
            required
            className="min-h-24 resize-y border-0 bg-transparent px-0.5 text-base leading-relaxed shadow-none focus-visible:ring-0 md:text-[17px]"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-[13.5px] text-muted-foreground">Write in English or Hindi. You can add proof after this.</span>
            <Button type="submit" size="lg" className="h-12 w-full rounded-lg px-5 text-base sm:w-auto">
              Start my legal notice <ArrowRight aria-hidden />
            </Button>
          </div>
        </form>
        {footer}
      </div>

      <aside aria-labelledby="pick-title" className="rounded-xl border border-white/15 bg-white/[.04] p-5">
        <h2 id="pick-title" className="m-0 text-xl leading-tight font-bold text-white">Which of these is happening to you?</h2>
        <p className="mt-1 mb-4 text-sm text-white/70">Pick one and we&apos;ll start the story for you. Fill in the blanks.</p>
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {scenarios.map((s) => {
            const on = text === s.example;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => pick(s.example)}
                  aria-pressed={on}
                  className={cn(
                    "group flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
                    on ? "border-genda bg-genda text-robe" : "border-white/15 text-white hover:border-genda",
                  )}
                >
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", on ? "bg-robe" : toneDot[s.tone])} />
                  <span className="flex-1">{s.title}</span>
                  <ArrowRight aria-hidden className={cn("size-4 transition-opacity", on ? "opacity-100" : "opacity-40 group-hover:opacity-100")} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 mb-0 text-sm text-white/75">
          Explore our <a href="#price" className="font-medium text-white underline underline-offset-4">three services and prices</a>.<br />
          Need public records?{" "}
          <Link href={signedIn ? "/matters/new/rti" : "/signup?next=/matters/new/rti"} className="font-medium text-white underline underline-offset-4">File an RTI application</Link>
        </p>
      </aside>
    </div>
  );
}

// A situation further down the page: fills the hero box and scrolls back up to it.
export function ScenarioLink({ title }: { title: string }) {
  const scenario = scenarios.find((s) => s.title === title);
  if (!scenario) return null;
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(PICK_EVENT, { detail: scenario.example }));
        document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
      }}
      className="inline-flex min-h-11 items-center gap-1.5 text-left text-[15px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
    >
      {scenario.title} <ArrowRight aria-hidden className="size-3.5" />
    </button>
  );
}

export function DraftBanner({ action }: { action: "dashboard" | "new" }) {
  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(readDraft()), []);
  if (!draft) return null;
  return (
    <div className="message success draft-banner" role="status">
      {action === "dashboard" ? (
        <>
          You started describing a problem on our home page.{" "}
          <Link href="/matters/new" className="text-link">Continue your legal notice →</Link>
        </>
      ) : (
        <>We&apos;ve kept what you wrote on the home page. Create the matter and it will be filled in for you to check.</>
      )}
    </div>
  );
}
