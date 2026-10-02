import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || extra?.apiUrl || "http://127.0.0.1:4000").replace(/\/$/, "");

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setToken = (value: string | null) => { token = value; };
export const getToken = () => token;
export const setUnauthorizedHandler = (handler: () => void) => { onUnauthorized = handler; };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const authHeaders = (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

async function send<T>(path: string, init: RequestInit, authenticated: boolean, timeoutMs: number): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (!(init.body instanceof FormData) && init.body) headers["Content-Type"] = "application/json";
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ApiError("We could not reach Lawmedy. Check your connection and try again.", 503);
  }
  if (response.status === 401 && authenticated) onUnauthorized?.();
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status >= 500
        ? "Something went wrong. Please try again."
        : Array.isArray(data.message) ? data.message.join(" ") : data.message || "Request failed.",
      response.status,
    );
  return data as T;
}

export const api = <T,>(path: string, init: RequestInit = {}, timeoutMs = 20000) => send<T>(path, init, true, timeoutMs);
export const publicApi = <T,>(path: string, init: RequestInit = {}) => send<T>(path, init, false, 20000);
export const post = <T,>(path: string, body?: unknown, timeoutMs = 20000) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, timeoutMs);

export async function uploadFile<T>(path: string, file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  return send<T>(path, { method: "POST", body: form }, true, 60000);
}
