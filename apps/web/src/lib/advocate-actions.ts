"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";
import type { FormState } from "./actions";

function failure(error: unknown): FormState {
  if (error instanceof ApiError) return { error: error.message };
  throw error;
}

export async function saveAdvocateDraft(
  matterId: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const count = Number(data.get("paragraphCount"));
  const paragraphs = Number.isSafeInteger(count)
    ? Array.from({ length: count }, (_, index) => ({
        text: data.get(`paragraph:${index}`),
      }))
    : [];
  try {
    await api(`/advocate/matters/${encodeURIComponent(matterId)}/draft`, {
      method: "POST",
      body: JSON.stringify({
        expectedVersion: Number(data.get("expectedVersion")),
        senderName: data.get("senderName"),
        senderAddress: data.get("senderAddress") || undefined,
        recipientName: data.get("recipientName"),
        recipientAddress: data.get("recipientAddress") || undefined,
        subject: data.get("subject"),
        paragraphs,
        demand: data.get("demand"),
        responsePeriod: data.get("responsePeriod"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/advocate/matters/${matterId}`);
  revalidatePath("/advocate");
  return { success: "A new advocate version has been saved." };
}

export async function saveAdvocateRtiDraft(
  matterId: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const informationRequests = data
    .getAll("request")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((text) => ({ text }));
  try {
    await api(`/advocate/matters/${encodeURIComponent(matterId)}/rti-draft`, {
      method: "POST",
      body: JSON.stringify({
        expectedVersion: Number(data.get("expectedVersion")),
        subject: data.get("subject"),
        informationRequests,
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/advocate/matters/${matterId}`);
  revalidatePath("/advocate");
  return { success: "A new advocate version has been saved." };
}

export async function requestAdvocateInformation(
  matterId: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await api(
      `/advocate/matters/${encodeURIComponent(matterId)}/request-information`,
      { method: "POST", body: JSON.stringify({ question: data.get("question") }) },
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/advocate/matters/${matterId}`);
  revalidatePath("/advocate");
  return { success: "The user has been notified." };
}

export async function approveAdvocateDraft(
  matterId: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await api(`/advocate/matters/${encodeURIComponent(matterId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ confirmed: data.get("confirmed") === "on" }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/advocate/matters/${matterId}`);
  revalidatePath("/advocate");
  return { success: "The draft has been approved and final delivery has started." };
}

export async function uploadSignedCertificate(matterId: string, _: FormState, data: FormData): Promise<FormState> {
  const file = data.get("file");
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024)
    return { error: "Choose a PDF up to 10 MB." };
  const form = new FormData();
  form.set("file", file);
  form.set("confirmed", String(data.get("confirmed") === "on"));
  form.set("expectedVersion", String(data.get("expectedVersion")));
  try {
    await api(`/advocate/matters/${encodeURIComponent(matterId)}/certificate-final`, { method: "POST", body: form }, true, 60000);
  } catch (error) { return failure(error); }
  revalidatePath(`/advocate/matters/${matterId}`);
  revalidatePath("/advocate");
  revalidatePath(`/matters/${matterId}`);
  return { success: "Your signed certificate was delivered privately to the user." };
}
