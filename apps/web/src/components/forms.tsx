"use client";
import { useActionState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Save,
} from "lucide-react";
import { authenticate, createMatter, saveStatement } from "@/lib/actions";
function Message({ error, success }: { error?: string; success?: string }) {
  return (
    <>
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="message success" role="status">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}
    </>
  );
}
export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {},
  );
  return (
    <form action={action} className="form-stack">
      {mode === "signup" && (
        <label>
          Full name
          <input
            name="fullName"
            autoComplete="name"
            placeholder="Your full name"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
      )}
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={
            mode === "signup"
              ? "Create a strong password"
              : "Enter your password"
          }
          required
          minLength={8}
          maxLength={72}
        />
        {mode === "signup" && (
          <span className="field-note">
            Use at least 8 characters (up to 72 UTF-8 bytes).
          </span>
        )}
      </label>
      <Message {...state} />
      <button className="button primary full" disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={18} /> : null}
        {pending
          ? "Please wait…"
          : mode === "signup"
            ? "Create your account"
            : "Log in"}
        {!pending && <ArrowRight size={18} />}
      </button>
      <p className="secure-note">
        <LockKeyhole size={14} /> Your information stays private to your
        account.
      </p>
    </form>
  );
}
export function CreateMatterForm({ type = "LEGAL_NOTICE" }: { type?: "LEGAL_NOTICE" | "RTI" }) {
  const [state, action, pending] = useActionState(createMatter.bind(null, type), {});
  return (
    <form action={action}>
      <Message {...state} />
      <button className="button primary" disabled={pending}>
        {pending ? (
          <LoaderCircle size={18} className="spin" />
        ) : (
          <ArrowRight size={18} />
        )}{" "}
        {pending ? "Creating your matter…" : "Create matter & continue"}
      </button>
    </form>
  );
}
export function StatementForm({
  id,
  initial,
  matterType = "LEGAL_NOTICE",
}: {
  id: string;
  initial: string;
  matterType?: "LEGAL_NOTICE" | "RTI";
}) {
  const [state, action, pending] = useActionState(
    saveStatement.bind(null, id),
    {},
  );
  return (
    <form action={action} className="form-stack">
      <label htmlFor="statement">
        {matterType === "RTI" ? "What information are you seeking?" : "What happened?"}
        <span className="field-note">
          {matterType === "RTI" ? "Describe the records or information you want, the relevant period, and any identifying details." : "Tell us in your own words. Include the people involved, key dates, and what you would like to resolve."}
        </span>
      </label>
      <textarea
        id="statement"
        name="statement"
        defaultValue={initial}
        placeholder={matterType === "RTI" ? "For example: certified copies of inspection reports for…" : "Start with what happened and when…"}
        required
        minLength={1}
        maxLength={20000}
        rows={10}
      />
      <div className="form-bottom">
        <span className="field-note">
          Saving sends your statement to Google Gemini for an AI summary and
          follow-up questions.
        </span>
        <button className="button primary" disabled={pending}>
          {pending ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Save size={17} />
          )}{" "}
          {pending ? "Saving & understanding…" : "Save & analyse statement"}
        </button>
      </div>
      <Message {...state} />
    </form>
  );
}
