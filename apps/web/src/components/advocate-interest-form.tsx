"use client";
import { useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://lawmedy-api.onrender.com").replace(/\/$/, "");

// Advocates register interest in the upcoming advocate portal. Sent straight from the browser so
// the API's per-visitor rate limit applies to each visitor, not to the website's server.
export function AdvocateInterestForm() {
  const [state, setState] = useState<{ status: "idle" | "sending" | "done"; error?: string; nudged?: boolean; name?: string }>({ status: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      fullName: String(form.get("fullName") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim() || undefined,
      practicePlace: String(form.get("practicePlace") || "").trim(),
      source: "web",
    };
    // Phone is optional, but it is how we reach people fastest, so ask once before going on without it.
    if (!body.phone && !state.nudged) {
      setState({ status: "idle", nudged: true });
      (e.currentTarget.elements.namedItem("phone") as HTMLInputElement | null)?.focus();
      return;
    }
    setState((s) => ({ ...s, status: "sending", error: undefined }));
    try {
      const res = await fetch(`${API}/public/advocate-interest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = res.status === 429 ? "Too many attempts. Please try again in a little while." : Array.isArray(data.message) ? "Please check the details and try again." : data.message || "Something went wrong. Please try again.";
        return setState((s) => ({ ...s, status: "idle", error: message }));
      }
      setState({ status: "done", name: body.fullName.split(" ")[0] });
    } catch {
      setState((s) => ({ ...s, status: "idle", error: "We could not reach Lawmedy. Check your connection and try again." }));
    }
  }

  if (state.status === "done")
    return <p className="message success" role="status">Thank you, {state.name}. You are on the list, and our team will reach out when the advocate portal opens.</p>;

  return (
    <form className="adv-form" onSubmit={submit} noValidate={false}>
      <label>Full name<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Adv. Your Name" /></label>
      <label>
        <span className="adv-label-row">Phone number <em>Recommended</em></span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="+91 98765 43210" aria-describedby="adv-phone-note" />
        <small id="adv-phone-note" className={state.nudged ? "nudge" : ""}>{state.nudged ? "A phone number is the quickest way for us to reach you. Add it, or send without it." : "Optional, but it is the fastest way for us to reach you, by call or WhatsApp."}</small>
      </label>
      <label>Email address<input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@example.com" /></label>
      <label>Where do you practise?<input name="practicePlace" required minLength={2} maxLength={160} placeholder="For example, Saket District Court, New Delhi" /></label>
      {state.error && <p className="message error" role="alert">{state.error}</p>}
      <button className="button primary" disabled={state.status === "sending"}>{state.status === "sending" ? "Sending…" : state.nudged ? "Send without phone" : "Register my interest"}</button>
      <small>We will only use these details to contact you about the advocate portal.</small>
    </form>
  );
}
