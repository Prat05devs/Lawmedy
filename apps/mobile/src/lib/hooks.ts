import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, ApiError } from "./api";

// Polling backs off (3s, 5s, 8s, 15s, then 30s), pauses while the app is in the background,
// refreshes once when it returns, and stops after ten minutes so a forgotten screen never
// keeps calling the API.
const STEPS = [3000, 5000, 8000, 15000, 30000];
const GIVE_UP_AFTER = 10 * 60 * 1000;

export function useApi<T>(path: string | null, pollWhen?: (data: T) => boolean, slowWhen?: (data: T) => boolean) {
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null } | null>(null);
  const data = result?.path === path ? result.data : null;
  const error = result?.path === path ? result.error : null;
  const loading = !!path && result?.path !== path;
  const pending = useRef<{ path: string; promise: Promise<void> } | null>(null);
  const attempt = useRef(0);
  const startedAt = useRef(0);

  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    if (pending.current?.path === path) return pending.current.promise;
    const promise = api<T>(path, {}, 30000).then((next) => {
      setResult({ path, data: next, error: null });
    }).catch((e) => {
      setResult((previous) => ({ path, data: previous?.path === path ? previous.data : null,
        error: e instanceof ApiError ? e.message : "Something went wrong." }));
    }).finally(() => { if (pending.current?.promise === promise) pending.current = null; });
    pending.current = { path, promise };
    return promise;
  }, [path]);

  useEffect(() => { void load(); }, [load]);

  const active = !!data && !!pollWhen?.(data);
  const slow = !!data && !!slowWhen?.(data);
  useEffect(() => {
    if (!active) { attempt.current = 0; startedAt.current = 0; return; }
    if (!startedAt.current) startedAt.current = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (stopped || Date.now() - startedAt.current > GIVE_UP_AFTER) return;
      timer = setTimeout(() => {
        if (AppState.currentState === "active") { attempt.current += 1; void load().finally(schedule); }
        else schedule();
      }, slow ? 60000 : STEPS[Math.min(attempt.current, STEPS.length - 1)]);
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") { attempt.current = 0; startedAt.current = Date.now(); void load(); }
    });
    schedule();
    return () => { stopped = true; if (timer) clearTimeout(timer); sub.remove(); };
  }, [active, slow, load]);

  return { data, error, loading, reload: () => { attempt.current = 0; return load(); } };
}

export const money = (paise: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(paise / 100);
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
