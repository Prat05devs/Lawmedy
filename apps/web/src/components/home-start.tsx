"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PICK_EVENT, scenarios } from "@/lib/scenarios";

// What a visitor types on the home page is kept only in their browser until they create a
// matter, where it pre-fills the statement for them to check and save.
export const DRAFT_KEY = "lawmedy:draft-statement";

export function readDraft() {
  try { return window.localStorage.getItem(DRAFT_KEY) ?? ""; } catch { return ""; }
}
export function clearDraft() {
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}

// Fills the hero box from anywhere on the page and scrolls back up to it.
export function pickSituation(example: string) {
  window.dispatchEvent(new CustomEvent(PICK_EVENT, { detail: example }));
  document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
}

// The hero's story box and the common situations under it.
export function HomeStart({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const onPick = (event: Event) => {
      setText((event as CustomEvent<string>).detail);
      box.current?.focus({ preventScroll: true });
    };
    window.addEventListener(PICK_EVENT, onPick);
    return () => window.removeEventListener(PICK_EVENT, onPick);
  }, []);

  const start = (event: React.FormEvent) => {
    event.preventDefault();
    try { window.localStorage.setItem(DRAFT_KEY, text.trim()); } catch { /* still continue */ }
    router.push(signedIn ? "/matters/new" : "/signup");
  };

  return (
    <>
      <form onSubmit={start} className="lx-card lx-ask lx-fade lx-d2">
        <label htmlFor="hero-statement">Tell us what happened</label>
        <textarea
          id="hero-statement"
          ref={box}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="For example: I lent ₹1.5 lakh to a friend in March. He promised to return it by June and now avoids my calls."
          rows={3}
          maxLength={5000}
          required
        />
        <div className="lx-ask-foot">
          <span>Write in English or Hindi. You can add proof after this.</span>
          <button type="submit" className="lx-btn lx-btn-primary">Start my legal notice</button>
        </div>
      </form>
      <div className="lx-picks lx-fade lx-d3" role="group" aria-label="Start from a common situation">
        {scenarios.map((s) => (
          <button key={s.title} type="button" className="lx-pick" aria-pressed={text === s.example} onClick={() => { setText(s.example); box.current?.focus(); }}>
            {s.title}
          </button>
        ))}
      </div>
    </>
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
