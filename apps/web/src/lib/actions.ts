"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError, Matter } from "./api";
export type FormState = { error?: string; success?: string };
function errorState(error: unknown): FormState {
  if (error instanceof ApiError) return { error: error.message };
  throw error;
}
export async function authenticate(
  mode: "signup" | "login",
  _: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    const result = await api<{ accessToken: string }>(
      `/auth/${mode}`,
      {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          ...(mode === "signup" ? { fullName: data.get("fullName") } : {}),
        }),
      },
      false,
    );
    (await cookies()).set("lawmedy_session", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
  } catch (error) {
    return errorState(error);
  }
  redirect("/dashboard");
}
export async function googleSignIn(idToken: string): Promise<FormState> {
  try {
    const result = await api<{ accessToken: string }>(
      "/auth/google",
      { method: "POST", body: JSON.stringify({ idToken }) },
      false,
    );
    (await cookies()).set("lawmedy_session", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
  } catch (error) {
    return errorState(error);
  }
  redirect("/dashboard");
}
export async function logout() {
  (await cookies()).delete("lawmedy_session");
  redirect("/login");
}
export async function createMatter(
  type: "LEGAL_NOTICE" | "RTI",
  _: FormState,
  _data: FormData,
): Promise<FormState> {
  let matter: Matter;
  try {
    matter = await api<Matter>("/matters", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/dashboard");
  redirect(`/matters/${matter.id}`);
}
export async function saveRtiDetails(id: string, _: FormState, data: FormData): Promise<FormState> {
  try {
    await api(`/matters/${encodeURIComponent(id)}/rti-details`, { method: "POST", body: JSON.stringify({
      governmentLevel: data.get("governmentLevel"), state: data.get("state") || undefined,
      department: data.get("department"), publicAuthorityId: data.get("publicAuthorityId"),
      subject: data.get("subject"), periodFrom: data.get("periodFrom") || undefined, periodTo: data.get("periodTo") || undefined,
    }) });
  } catch (error) { return errorState(error); }
  revalidatePath(`/matters/${id}`);
  return { success: "Your RTI authority and request details are saved." };
}
export async function saveStatement(
  id: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await api(
      `/matters/${encodeURIComponent(id)}/statement`,
      {
        method: "POST",
        body: JSON.stringify({ statement: data.get("statement") }),
      },
      true,
      75000,
    );
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  revalidatePath("/dashboard");
  return {
    success: "Your statement is saved.",
  };
}

export async function retryIntake(
  id: string,
  _: FormState,
  _data: FormData,
): Promise<FormState> {
  try {
    await api(
      `/matters/${encodeURIComponent(id)}/intake/retry`,
      { method: "POST" },
      true,
      75000,
    );
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  return {};
}

export async function saveAnswers(
  id: string,
  analysisId: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const answers = Array.from(data.entries())
    .filter(([key]) => key.startsWith("answer:"))
    .map(([key, answer]) => ({ questionId: key.slice(7), answer }));
  try {
    await api(`/matters/${encodeURIComponent(id)}/answers`, {
      method: "POST",
      body: JSON.stringify({ analysisId, answers }),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  return { success: "Your answers have been saved." };
}

export async function uploadEvidence(
  id: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Choose a PDF or image to upload." };
  try {
    await api(
      `/matters/${encodeURIComponent(id)}/evidence`,
      { method: "POST", body: data },
      true,
      30000,
    );
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  return { success: "Your file is uploaded securely." };
}

export async function retryEvidence(
  matterId: string,
  evidenceId: string,
  _: FormState,
  _data: FormData,
): Promise<FormState> {
  try {
    await api(
      `/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(evidenceId)}/retry`,
      { method: "POST" },
    );
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${matterId}`);
  return {};
}

export async function prepareReview(
  id: string,
  _: FormState,
  _data: FormData,
): Promise<FormState> {
  try {
    await api(`/matters/${encodeURIComponent(id)}/review/prepare`, {
      method: "POST",
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  return { success: "Your available facts are ready to review." };
}

export async function confirmReview(
  id: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  const selections = Array.from(data.entries())
    .filter(([key]) => key.startsWith("fact:"))
    .map(([key, caseFactId]) => ({
      type: key.slice(5),
      caseFactId: String(caseFactId),
    }));
  try {
    await api(`/matters/${encodeURIComponent(id)}/review/confirm`, {
      method: "POST",
      body: JSON.stringify({
        selections,
        applicant: {
          address: data.get("applicantAddress"),
          phone: data.get("applicantPhone") || undefined,
        },
        ...(data.get("recipientName") ? { recipient: {
          name: data.get("recipientName"),
          address: data.get("recipientAddress"),
          phone: data.get("recipientPhone") || undefined,
          email: data.get("recipientEmail") || undefined,
        }} : {}),
        confirmed: data.get("confirmed") === "on",
      }),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  revalidatePath("/dashboard");
  return { success: "Your case information is confirmed." };
}

export type CheckoutDetails = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
};
export type PaymentState = FormState & { checkout?: CheckoutDetails };
export async function createPaymentOrder(
  id: string,
  _: PaymentState,
  _data: FormData,
): Promise<PaymentState> {
  try {
    const checkout = await api<CheckoutDetails>(
      `/matters/${encodeURIComponent(id)}/payment/order`,
      { method: "POST" },
    );
    return { checkout };
  } catch (error) {
    return errorState(error);
  }
}

export async function verifyPayment(
  id: string,
  payment: { orderId: string; paymentId: string; signature: string },
) {
  try {
    await api(`/matters/${encodeURIComponent(id)}/payment/verify`, {
      method: "POST",
      body: JSON.stringify(payment),
    });
    revalidatePath(`/matters/${id}`);
    return true;
  } catch {
    // The signed webhook can still confirm the payment.
    return false;
  }
}

export async function retryDocument(
  id: string,
  _: FormState,
  _data: FormData,
): Promise<FormState> {
  try {
    await api(
      `/matters/${encodeURIComponent(id)}/document/retry`,
      { method: "POST" },
      true,
      150000,
    );
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  revalidatePath("/dashboard");
  return {};
}

export async function respondToAdvocate(
  id: string,
  questionId: string,
  _: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await api(`/matters/${encodeURIComponent(id)}/advocate-response`, {
      method: "POST",
      body: JSON.stringify({ questionId, answer: data.get("answer") }),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  revalidatePath("/dashboard");
  return { success: "Your response has been sent to the advocate." };
}

export async function retryFinalDocument(
  id: string,
  _: FormState,
  _data: FormData,
): Promise<FormState> {
  try {
    await api(
      `/matters/${encodeURIComponent(id)}/final-document/retry`,
      { method: "POST" },
      true,
      60000,
    );
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/matters/${id}`);
  revalidatePath("/dashboard");
  return { success: "Your final PDF is ready." };
}
