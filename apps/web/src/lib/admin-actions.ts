"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import type { FormState } from "@/lib/actions";

const fail = (error: unknown): FormState => ({
  error: error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
});
const enc = encodeURIComponent;

export async function verifyPaymentAction(paymentId: string, matterId: string | null, _: FormState): Promise<FormState> {
  try { await api(`/admin/payments/${enc(paymentId)}/verify`, { method: "POST" }, true, 30000); }
  catch (e) { return fail(e); }
  revalidatePath("/admin"); revalidatePath("/admin/payments"); if (matterId) revalidatePath(`/admin/matters/${matterId}`);
  return { success: "Payment verified. The user has been notified and the work has started." };
}

export async function rejectPaymentAction(paymentId: string, matterId: string | null, _: FormState, data: FormData): Promise<FormState> {
  try { await api(`/admin/payments/${enc(paymentId)}/reject`, { method: "POST", body: JSON.stringify({ note: data.get("note") }) }); }
  catch (e) { return fail(e); }
  revalidatePath("/admin"); revalidatePath("/admin/payments"); if (matterId) revalidatePath(`/admin/matters/${matterId}`);
  return { success: "Payment rejected. The user has been asked to pay again." };
}

export async function assignAdvocateAction(matterId: string, _: FormState, data: FormData): Promise<FormState> {
  try { await api(`/admin/matters/${enc(matterId)}/assign`, { method: "POST", body: JSON.stringify({ advocateId: data.get("advocateId") }) }); }
  catch (e) { return fail(e); }
  revalidatePath(`/admin/matters/${matterId}`); revalidatePath("/admin/matters");
  return { success: "Advocate assigned." };
}

export async function createAdvocateAction(_: FormState, data: FormData): Promise<FormState> {
  try {
    await api("/admin/advocates", { method: "POST", body: JSON.stringify({ fullName: data.get("fullName"), email: data.get("email"), password: data.get("password") }) });
  } catch (e) { return fail(e); }
  revalidatePath("/admin/advocates");
  return { success: "Advocate account created. Share the login details with them securely." };
}

export async function setAdvocateActiveAction(advocateId: string, active: boolean, _: FormState): Promise<FormState> {
  try { await api(`/admin/advocates/${enc(advocateId)}/active`, { method: "POST", body: JSON.stringify({ active }) }); }
  catch (e) { return fail(e); }
  revalidatePath("/admin/advocates");
  return { success: active ? "Advocate activated." : "Advocate deactivated." };
}

export async function resetAdvocatePasswordAction(advocateId: string, _: FormState, data: FormData): Promise<FormState> {
  try { await api(`/admin/advocates/${enc(advocateId)}/password`, { method: "POST", body: JSON.stringify({ password: data.get("password") }) }); }
  catch (e) { return fail(e); }
  revalidatePath("/admin/advocates");
  return { success: "Password updated." };
}

export async function saveTestimonialAction(id: string | null, _: FormState, data: FormData): Promise<FormState> {
  const type = String(data.get("matterType") || "");
  try {
    await api(id ? `/admin/testimonials/${enc(id)}` : "/admin/testimonials", {
      method: "POST",
      body: JSON.stringify({
        name: data.get("name"),
        descriptor: data.get("descriptor") || undefined,
        quote: data.get("quote"),
        matterType: type === "LEGAL_NOTICE" || type === "RTI" ? type : undefined,
        consentGiven: data.get("consentGiven") === "on",
        published: data.get("published") === "on",
      }),
    });
  } catch (e) { return fail(e); }
  revalidatePath("/admin/testimonials"); revalidatePath("/");
  return { success: id ? "Saved." : "Testimonial added." };
}

export async function deleteTestimonialAction(id: string, _: FormState): Promise<FormState> {
  try { await api(`/admin/testimonials/${enc(id)}/delete`, { method: "POST" }); }
  catch (e) { return fail(e); }
  revalidatePath("/admin/testimonials"); revalidatePath("/");
  return { success: "Deleted." };
}

export async function setAdvocateInterestStatusAction(id: string, _: FormState, data: FormData): Promise<FormState> {
  try { await api(`/admin/advocate-interest/${enc(id)}/status`, { method: "POST", body: JSON.stringify({ status: data.get("status") }) }); }
  catch (e) { return fail(e); }
  revalidatePath("/admin/advocate-signups"); revalidatePath("/admin");
  return { success: "Status saved." };
}
