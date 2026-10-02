import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

export function useApi<T>(path: string | null, pollWhen?: (data: T) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const poll = useRef(pollWhen);
  poll.current = pollWhen;

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
  useEffect(() => {
    if (!data || !poll.current?.(data)) return;
    const timer = setTimeout(() => void load(true), 4000);
    return () => clearTimeout(timer);
  }, [data, load]);

  return { data, error, loading, reload: () => load(true) };
}

export const money = (paise: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(paise / 100);
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
