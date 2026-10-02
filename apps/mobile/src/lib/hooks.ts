import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, ApiError } from "./api";

// Polling backs off (3s, 5s, 8s, 15s, then 30s), pauses while the app is in the background,
// refreshes once when it returns, and stops after ten minutes so a forgotten screen never
// keeps calling the API.
const STEPS = [3000, 5000, 8000, 15000, 30000];
const GIVE_UP_AFTER = 10 * 60 * 1000;

export function useApi<T>(path: string | null, pollWhen?: (data: T) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const poll = useRef(pollWhen);
  poll.current = pollWhen;
  const attempt = useRef(0);
  const startedAt = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!path) { setData(null); setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      setData(await api<T>(path, {}, 30000));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void load(); }, [load]);

  const active = !!data && !!poll.current?.(data);
  useEffect(() => {
    if (!active) { attempt.current = 0; startedAt.current = 0; return; }
    if (!startedAt.current) startedAt.current = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (Date.now() - startedAt.current > GIVE_UP_AFTER) return;
      timer = setTimeout(() => {
        if (AppState.currentState === "active") { attempt.current += 1; void load(true); }
        schedule();
      }, STEPS[Math.min(attempt.current, STEPS.length - 1)]);
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") { attempt.current = 0; startedAt.current = Date.now(); void load(true); }
    });
    schedule();
    return () => { if (timer) clearTimeout(timer); sub.remove(); };
  }, [active, load]);

  return { data, error, loading, reload: () => { attempt.current = 0; return load(true); } };
}

export const money = (paise: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(paise / 100);
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
