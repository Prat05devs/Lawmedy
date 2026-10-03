import type { ConfigService } from "@nestjs/config";

// Extra models used only after every Gemini model has failed with an outage-type error
// (overloaded, over quota, timeout). They speak the OpenAI-compatible chat API, so adding a
// provider is a matter of configuration. Order is the order tried.
export type FallbackProvider = { name: string; baseUrl: string; apiKey: string; model: string };

export type ModelResponse = {
  text?: string;
  usageMetadata?: { promptTokenCount?: number | null; candidatesTokenCount?: number | null };
  servedBy?: string;
};

export function fallbackProviders(config: ConfigService): FallbackProvider[] {
  const get = (key: string, fallback = "") => config.get<string>(key, fallback).trim();
  const usable = (value: string) => !!value && !value.startsWith("replace-");
  const all: Record<string, FallbackProvider | null> = {
    groq: usable(get("GROQ_API_KEY"))
      ? { name: "groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: get("GROQ_API_KEY"), model: get("GROQ_MODEL", "openai/gpt-oss-120b") }
      : null,
    cloudflare: usable(get("CLOUDFLARE_AI_TOKEN")) && usable(get("CLOUDFLARE_ACCOUNT_ID"))
      ? { name: "cloudflare", baseUrl: `https://api.cloudflare.com/client/v4/accounts/${get("CLOUDFLARE_ACCOUNT_ID")}/ai/v1`, apiKey: get("CLOUDFLARE_AI_TOKEN"), model: get("CLOUDFLARE_MODEL", "@cf/meta/llama-3.3-70b-instruct-fp8-fast") }
      : null,
    openrouter: usable(get("OPENROUTER_API_KEY")) && usable(get("OPENROUTER_MODEL"))
      ? { name: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: get("OPENROUTER_API_KEY"), model: get("OPENROUTER_MODEL") }
      : null,
  };
  return get("AI_FALLBACK_PROVIDERS", "groq,cloudflare,openrouter")
    .split(",")
    .map((name) => all[name.trim()])
    .filter((provider): provider is FallbackProvider => !!provider);
}

// Gemini request contents -> plain text. Attached files cannot be sent to these models.
export function contentsToText(contents: unknown): string {
  if (typeof contents === "string") return contents;
  if (!Array.isArray(contents)) return "";
  return contents
    .flatMap((item) => (item && typeof item === "object" && "parts" in item && Array.isArray(item.parts) ? item.parts : [item]))
    .map((part) => (part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : typeof part === "string" ? part : ""))
    .filter(Boolean)
    .join("\n\n");
}

export async function callFallback(
  provider: FallbackProvider,
  input: { system: string; user: string; schema?: unknown },
  timeoutMs = 60_000,
): Promise<ModelResponse> {
  const system = `${input.system}\n\nRespond with a single JSON object only, with no prose or code fences.${
    input.schema ? ` It must match this JSON Schema:\n${JSON.stringify(input.schema)}` : ""
  }`;
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "system", content: system }, { role: "user", content: input.user }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8192,
      ...(provider.model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`${provider.name} ${response.status}: ${body.error?.message ?? "request failed"}`.slice(0, 300));
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider.name} returned no content`);
  return {
    text,
    usageMetadata: { promptTokenCount: body.usage?.prompt_tokens ?? null, candidatesTokenCount: body.usage?.completion_tokens ?? null },
    servedBy: `${provider.name}:${provider.model}`,
  };
}
