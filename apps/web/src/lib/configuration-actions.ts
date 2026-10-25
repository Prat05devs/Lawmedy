"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type { FormState } from "@/lib/actions";

type Kind = "razorpay" | "payment-mode" | "gemini-key" | "gemini-model";
export async function saveProviderConfigurationAction(
  kind: Kind,
  id: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const optional = (key: string) =>
    String(data.get(key) ?? "").trim() || undefined;
  let path: string;
  let body: unknown;
  if (kind === "razorpay" && ["live", "test"].includes(id)) {
    path = `/admin/configuration/razorpay/${id}`;
    body = {
      keyId: optional("keyId"),
      keySecret: optional("keySecret"),
      webhookSecret: optional("webhookSecret"),
    };
  } else if (kind === "payment-mode") {
    path = "/admin/configuration/payment-mode";
    body = { mode: data.get("mode") };
  } else if (kind === "gemini-key" && (!id || /^[a-f0-9-]{36}$/i.test(id))) {
    path = `/admin/configuration/gemini/keys${id ? `/${id}` : ""}`;
    body = {
      label: data.get("label"),
      apiKey: optional("apiKey"),
      priority: Number(data.get("priority")),
      enabled: data.get("enabled") === "on",
    };
  } else if (kind === "gemini-model") {
    path = "/admin/configuration/gemini/model";
    body = {
      model: data.get("model"),
      fallbackModels: String(data.get("fallbackModels") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    };
  } else return { error: "Unknown configuration option." };
  try {
    await api(path, { method: "POST", body: JSON.stringify(body) });
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Configuration could not be saved. Please try again.",
    };
  }
  revalidatePath("/admin/configuration");
  return {
    success: "Saved. The new configuration is active for new requests.",
  };
}
