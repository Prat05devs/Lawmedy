"use client";
import { useActionState, useState } from "react";
import { KeyRound, Search, ShieldCheck } from "lucide-react";
import { saveProviderConfigurationAction } from "@/lib/configuration-actions";
import type { ProviderConfiguration } from "@/lib/configuration-types";
import type { FormState } from "@/lib/actions";

type Kind = Parameters<typeof saveProviderConfigurationAction>[0];
function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p className="message error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="message success" role="status">
          {state.success}
        </p>
      )}
    </>
  );
}
function SaveForm({
  kind,
  id = "",
  disabled,
  children,
  title = "Save changes",
}: {
  kind: Kind;
  id?: string;
  disabled: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  const [state, action, pending] = useActionState(
    saveProviderConfigurationAction.bind(null, kind, id),
    {},
  );
  return (
    <form action={action} className="form-stack">
      <fieldset
        disabled={disabled || pending}
        className="m-0 grid min-w-0 gap-4 border-0 p-0"
      >
        {children}
        <button className="button primary justify-self-start" type="submit">
          {pending ? "Saving…" : title}
        </button>
      </fieldset>
      <Feedback state={state} />
    </form>
  );
}
function SecretInput({
  name,
  label,
  configured = false,
  required = false,
  pattern,
}: {
  name: string;
  label: string;
  configured?: boolean;
  required?: boolean;
  pattern?: string;
}) {
  return (
    <label>
      {label}{" "}
      <small className="muted">
        {configured
          ? "Stored securely. Leave blank to keep it."
          : "Not configured"}
      </small>
      <input
        name={name}
        type="password"
        autoComplete="new-password"
        spellCheck={false}
        required={required}
        minLength={name === "keyId" ? undefined : name === "apiKey" ? 20 : 16}
        maxLength={256}
        pattern={pattern}
        placeholder={
          configured
            ? "Enter a replacement to update"
            : `Enter ${label.toLowerCase()}`
        }
      />
    </label>
  );
}
export function ProviderConfigurationPanel({
  settings,
}: {
  settings: ProviderConfiguration;
}) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (text: string) =>
    words.every((word) => text.toLowerCase().includes(word));
  const paymentVisible = matches(
    "razorpay payments checkout webhook credentials key id key secret mode live test",
  );
  const geminiVisible = matches(
    `google gemini ai model primary backup fallback api keys credentials ${settings.gemini.keys.map((k) => k.label).join(" ")}`,
  );
  const historyVisible = matches(
    "configuration audit history changes activity",
  );
  const enabled = settings.gemini.keys.filter((key) => key.enabled);
  return (
    <div className="grid gap-6">
      <label
        className="grid gap-2 font-semibold"
        htmlFor="configuration-search"
      >
        <span className="flex items-center gap-2">
          <Search size={18} aria-hidden /> Search configuration
        </span>
        <input
          id="configuration-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Razorpay, webhook, live mode, Gemini, backup keys…"
          className="w-full"
        />
      </label>
      <p className="muted small flex items-start gap-2">
        <ShieldCheck size={18} aria-hidden className="shrink-0" />
        Secret values are encrypted and never shown after saving. Each update is
        recorded in the admin audit history.
      </p>
      {!settings.editable && (
        <p className="message error" role="alert">
          Provider editing needs a one-time CONFIG_ENCRYPTION_KEY on the API
          host. Existing environment configuration continues to work.
        </p>
      )}
      {paymentVisible && (
        <section className="panel grid gap-6" aria-labelledby="razorpay-title">
          <div>
            <h2 id="razorpay-title">Razorpay payments</h2>
            <p className="muted">
              Active mode:{" "}
              <strong
                className={
                  settings.paymentMode === "live" ? "text-rani-ink" : ""
                }
              >
                {settings.paymentMode === "live"
                  ? "Live · real payments"
                  : settings.paymentMode === "manual"
                    ? "Manual · reference verification"
                    : "Test · simulated payments"}
              </strong>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <SaveForm
              kind="payment-mode"
              disabled={!settings.editable}
              title="Apply payment mode"
            >
              <div
                role="radiogroup"
                aria-label="Payment mode"
                className="grid gap-3 sm:grid-cols-2"
              >
                <label className="check">
                  <input
                    type="radio"
                    name="mode"
                    value="test"
                    defaultChecked={settings.paymentMode === "test"}
                  />{" "}
                  Test mode · simulated payments
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="mode"
                    value="live"
                    defaultChecked={settings.paymentMode === "live"}
                  />{" "}
                  Live mode · real payments
                </label>
              </div>
              <p className="field-note">
                New matters use the selected mode. Existing payment orders keep
                their original credentials so they can still be verified.
              </p>
            </SaveForm>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {settings.razorpay.map((item) => (
              <div key={item.mode} className="admin-card min-w-0">
                <h3>
                  {item.mode === "live"
                    ? "Live credentials"
                    : "Test credentials"}
                </h3>
                <p className="muted small">
                  {item.configured
                    ? `Configured · Key ID ending ${item.keyHint}`
                    : "Setup incomplete"}
                </p>
                <SaveForm
                  kind="razorpay"
                  id={item.mode}
                  disabled={!settings.editable}
                  title={`Save ${item.mode} credentials`}
                >
                  <SecretInput
                    name="keyId"
                    label="Key ID"
                    configured={!!item.keyHint}
                    required={!item.keyHint}
                    pattern={`rzp_${item.mode}_[A-Za-z0-9]+`}
                  />
                  <SecretInput
                    name="keySecret"
                    label="Key Secret"
                    configured={item.hasKeySecret}
                    required={!item.hasKeySecret}
                  />
                  <SecretInput
                    name="webhookSecret"
                    label="Webhook Secret"
                    configured={item.hasWebhookSecret}
                    required={!item.hasWebhookSecret}
                  />
                </SaveForm>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
            <strong>Webhook setup</strong>
            <p className="my-2">
              In Razorpay, configure each mode’s webhook to your public HTTPS
              API domain followed by{" "}
              <code className="break-all">/payments/razorpay/webhook</code>,
              select <code>payment.captured</code>, and use the same Webhook
              Secret saved above for that mode.
            </p>
            <p className="mb-0">
              Razorpay’s dashboard registration is a separate step; saving
              credentials here does not create the webhook at Razorpay.
            </p>
          </div>
        </section>
      )}
      {geminiVisible && (
        <section className="panel grid gap-6" aria-labelledby="gemini-title">
          <div>
            <h2 id="gemini-title">Google Gemini AI</h2>
            <p className="muted">
              {enabled.length
                ? `${enabled.length} enabled key${enabled.length === 1 ? "" : "s"}. Lowest priority number runs first; the others provide backup.`
                : "No enabled keys. AI drafting is currently unavailable."}
            </p>
          </div>
          <div className="admin-card">
            <h3>Models</h3>
            <SaveForm
              kind="gemini-model"
              disabled={!settings.editable}
              title="Save model settings"
            >
              <label>
                Primary model
                <input
                  name="model"
                  required
                  maxLength={120}
                  defaultValue={settings.gemini.model}
                  placeholder="Gemini model identifier"
                  spellCheck={false}
                />
              </label>
              <label>
                Fallback models{" "}
                <small className="muted">
                  Optional. Up to two, separated by commas.
                </small>
                <input
                  name="fallbackModels"
                  defaultValue={settings.gemini.fallbackModels.join(", ")}
                  placeholder="model-one, model-two"
                  spellCheck={false}
                />
              </label>
            </SaveForm>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {settings.gemini.keys.map((key) => (
              <div key={key.id} className="admin-card min-w-0">
                <h3 className="flex items-center gap-2">
                  <KeyRound size={18} aria-hidden />
                  {key.label}
                </h3>
                <p className="muted small">
                  {!key.enabled
                    ? "Disabled"
                    : key.id === enabled[0]?.id
                      ? "Primary key"
                      : "Backup key"}
                </p>
                <SaveForm
                  kind="gemini-key"
                  id={key.id}
                  disabled={!settings.editable}
                  title="Update key"
                >
                  <label>
                    Label
                    <input
                      name="label"
                      required
                      maxLength={80}
                      defaultValue={key.label}
                    />
                  </label>
                  <SecretInput name="apiKey" label="API key" configured />
                  <label>
                    Priority
                    <input
                      name="priority"
                      type="number"
                      required
                      min={0}
                      max={1000}
                      defaultValue={key.priority}
                    />
                    <small className="muted">
                      Lower numbers are tried first.
                    </small>
                  </label>
                  <label className="check">
                    <input
                      name="enabled"
                      type="checkbox"
                      defaultChecked={key.enabled}
                    />{" "}
                    Enable this key
                  </label>
                </SaveForm>
              </div>
            ))}
            <div className="admin-card min-w-0">
              <h3>Add a Gemini key</h3>
              <SaveForm
                kind="gemini-key"
                disabled={!settings.editable}
                title="Add key"
              >
                <label>
                  Label
                  <input
                    name="label"
                    required
                    maxLength={80}
                    placeholder="For example, Backup project"
                  />
                </label>
                <SecretInput name="apiKey" label="API key" required />
                <label>
                  Priority
                  <input
                    name="priority"
                    type="number"
                    required
                    min={0}
                    max={1000}
                    defaultValue={Math.min(
                      1000,
                      (settings.gemini.keys.at(-1)?.priority ?? -10) + 10,
                    )}
                  />
                </label>
                <label className="check">
                  <input name="enabled" type="checkbox" defaultChecked /> Enable
                  this key
                </label>
              </SaveForm>
            </div>
          </div>
          <p className="field-note">
            Backup keys are tried automatically for rejected keys, quota limits
            and provider outages. Each Gemini attempt is logged. Keys in the
            same Google Cloud project may share quotas.
          </p>
        </section>
      )}
      {historyVisible && (
        <section className="panel" aria-labelledby="configuration-history">
          <h2 id="configuration-history">Recent changes</h2>
          {settings.audit.length ? (
            <ul className="m-0 grid list-none gap-3 p-0">
              {settings.audit.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3"
                >
                  <span className="text-sm capitalize">
                    {event.action.toLowerCase().replaceAll("_", " ")}
                  </span>
                  <time
                    className="text-sm text-muted-foreground"
                    dateTime={event.createdAt}
                  >
                    {new Date(event.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No configuration changes yet.</p>
          )}
        </section>
      )}
      {!paymentVisible && !geminiVisible && !historyVisible && (
        <p role="status" className="panel muted">
          No configuration matches “{query}”. Try “Razorpay”, “webhook” or
          “Gemini”.
        </p>
      )}
    </div>
  );
}
