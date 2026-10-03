import { useEffect, useState } from "react";
import { publicApi } from "./api";

// Public content (prices, authorities, testimonials) changes rarely. Fetch once per app
// session and share it, instead of calling the API every time a screen appears.
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function usePublic<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>((cache.get(path) as T | undefined) ?? fallback);
  useEffect(() => {
    if (cache.has(path)) return;
    let live = true;
    const request = inflight.get(path) ?? publicApi<T>(path).then((value) => { cache.set(path, value); return value; }).finally(() => inflight.delete(path));
    inflight.set(path, request);
    request.then((value) => { if (live) setData(value as T); }).catch(() => undefined);
    return () => { live = false; };
  }, [path]);
  return data;
}

export type Pricing = { currency: string; legalNotice: number; rti: number };
export type Testimonial = { id: string; name: string; descriptor: string | null; quote: string; matterType: "LEGAL_NOTICE" | "RTI" | null };
export type PublicAuthority = { id: string; name: string; department: string; governmentLevel: "CENTRAL" | "STATE" | "LOCAL"; state: string | null; address: string };
export type QuickCheck = { document: string; category: string; summary: string; facts: { key: string; value: string }[]; needed: string[] };
