"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// One poller per page, used only while the server says work is in progress.
// It backs off (3s, 5s, 8s, 15s, then 30s), pauses while the tab is hidden, refreshes
// once when the tab becomes visible again, and gives up after ten minutes so a forgotten
// tab never keeps calling the API.
const STEPS = [3000, 5000, 8000, 15000, 30000];
const GIVE_UP_AFTER = 10 * 60 * 1000;

export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  const attempt = useRef(0);

  useEffect(() => {
    if (!active) { attempt.current = 0; return; }
    const startedAt = Date.now();
    let timer: number | undefined;
    const schedule = () => {
      if (Date.now() - startedAt > GIVE_UP_AFTER) return;
      const delay = STEPS[Math.min(attempt.current, STEPS.length - 1)];
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") { attempt.current += 1; router.refresh(); }
        schedule();
      }, delay);
    };
    const onVisible = () => { if (document.visibilityState === "visible") { attempt.current = 0; router.refresh(); } };
    document.addEventListener("visibilitychange", onVisible);
    schedule();
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [active, router]);

  return null;
}
