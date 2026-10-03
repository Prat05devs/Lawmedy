"use client";
import { useActionState, useState } from "react";
import { BadgeCheck, LoaderCircle, UserPlus, XCircle } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { deleteTestimonialAction, saveTestimonialAction, assignAdvocateAction, createAdvocateAction, rejectPaymentAction, resetAdvocatePasswordAction, setAdvocateActiveAction, verifyPaymentAction } from "@/lib/admin-actions";

const Msg = ({ state }: { state: FormState }) =>
  state.error ? <p className="message error" role="alert">{state.error}</p> : state.success ? <p className="message success" role="status">{state.success}</p> : null;

export function PaymentActions({ paymentId, matterId, amount, reference }: { paymentId: string; matterId: string | null; amount: string; reference: string }) {
  const [vState, verify, verifying] = useActionState(verifyPaymentAction.bind(null, paymentId, matterId), {});
  const [rState, reject, rejecting] = useActionState(rejectPaymentAction.bind(null, paymentId, matterId), {});
  const [open, setOpen] = useState(false);
  return (
    <div className="pay-actions">
      <form action={verify} onSubmit={(e) => { if (!confirm(`Confirm that ${amount} was received with reference ${reference}?`)) e.preventDefault(); }}>
        <button className="button primary" disabled={verifying || rejecting}>
          {verifying ? <LoaderCircle className="spin" size={16} /> : <BadgeCheck size={16} />} Payment received and accurate
        </button>
      </form>
      {!open ? (
        <button type="button" className="button outline" onClick={() => setOpen(true)}><XCircle size={16} /> Reject</button>
      ) : (
        <form action={reject} className="form-stack">
          <label>Reason shown to the user<input name="note" required minLength={3} maxLength={500} placeholder="e.g. The amount received was lower than the fee." /></label>
          <button className="button outline" disabled={rejecting}>{rejecting ? "Rejecting…" : "Confirm rejection"}</button>
        </form>
      )}
      <Msg state={vState} /><Msg state={rState} />
    </div>
  );
}

export function AssignForm({ matterId, advocates, current }: { matterId: string; advocates: { id: string; fullName: string; open: number }[]; current?: string }) {
  const [state, action, pending] = useActionState(assignAdvocateAction.bind(null, matterId), {});
  return (
    <form action={action} className="form-stack">
      <label>Advocate
        <select name="advocateId" defaultValue={current ?? ""} required>
          <option value="" disabled>Select an advocate</option>
          {advocates.map((a) => <option key={a.id} value={a.id}>{a.fullName} · {a.open} open</option>)}
        </select>
      </label>
      <button className="button primary" disabled={pending}>{pending ? "Assigning…" : current ? "Reassign" : "Assign"}</button>
      <Msg state={state} />
    </form>
  );
}

export function CreateAdvocateForm() {
  const [state, action, pending] = useActionState(createAdvocateAction, {});
  return (
    <form action={action} className="form-stack admin-card">
      <h3><UserPlus size={18} /> Add an advocate</h3>
      <label>Full name<input name="fullName" required minLength={2} /></label>
      <label>Email<input name="email" type="email" required /></label>
      <label>Temporary password<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label>
      <button className="button primary" disabled={pending}>{pending ? "Creating…" : "Create advocate"}</button>
      <Msg state={state} />
    </form>
  );
}

export function AdvocateRow({ id, fullName, email, active, open, completed }: { id: string; fullName: string; email: string; active: boolean; open: number; completed: number }) {
  const [aState, toggle, toggling] = useActionState(setAdvocateActiveAction.bind(null, id, !active), {});
  const [pState, reset, resetting] = useActionState(resetAdvocatePasswordAction.bind(null, id), {});
  const [show, setShow] = useState(false);
  return (
    <div className={`admin-row ${active ? "" : "inactive"}`}>
      <div><strong>{fullName}</strong><small>{email}</small></div>
      <div className="admin-stats"><span>{open} open</span><span>{completed} done</span><span className={`pill ${active ? "ok" : "off"}`}>{active ? "Active" : "Inactive"}</span></div>
      <div className="admin-row-actions">
        <form action={toggle}><button className="button outline" disabled={toggling}>{active ? "Deactivate" : "Activate"}</button></form>
        <button type="button" className="button ghost" onClick={() => setShow((v) => !v)}>Reset password</button>
      </div>
      {show && (
        <form action={reset} className="admin-inline">
          <input name="password" type="password" required minLength={8} maxLength={72} placeholder="New password" autoComplete="new-password" />
          <button className="button primary" disabled={resetting}>Save</button>
        </form>
      )}
      <Msg state={aState} /><Msg state={pState} />
    </div>
  );
}

export type TestimonialRow = { id: string; name: string; descriptor: string | null; quote: string; matterType: "LEGAL_NOTICE" | "RTI" | null; consentGiven: boolean; published: boolean };

export function TestimonialForm({ item }: { item?: TestimonialRow }) {
  const [state, action, pending] = useActionState(saveTestimonialAction.bind(null, item?.id ?? null), {});
  const [del, remove, deleting] = useActionState(deleteTestimonialAction.bind(null, item?.id ?? ""), {});
  return (
    <div className="admin-card">
      <form action={action} className="form-stack">
        <h3>{item ? item.name : "Add a testimonial"}</h3>
        <label>Name as they want it shown<input name="name" required minLength={2} maxLength={80} defaultValue={item?.name} /></label>
        <label>Where from or what for <span className="muted small">Optional, e.g. Dehradun, legal notice</span><input name="descriptor" maxLength={120} defaultValue={item?.descriptor ?? ""} /></label>
        <label>Their words<textarea name="quote" required minLength={20} maxLength={600} rows={4} defaultValue={item?.quote} /></label>
        <label>Document<select name="matterType" defaultValue={item?.matterType ?? ""}><option value="">Not specified</option><option value="LEGAL_NOTICE">Legal notice</option><option value="RTI">RTI application</option></select></label>
        <label className="check"><input type="checkbox" name="consentGiven" defaultChecked={item?.consentGiven} /> This person agreed to have their words and name shown publicly</label>
        <label className="check"><input type="checkbox" name="published" defaultChecked={item?.published} /> Show on the website and in the app</label>
        <button className="button primary" disabled={pending}>{pending ? "Saving…" : item ? "Save" : "Add"}</button>
        <Msg state={state} />
      </form>
      {item && <form action={remove}><button className="text-button" disabled={deleting} onClick={(e) => { if (!confirm("Delete this testimonial?")) e.preventDefault(); }}>Delete</button><Msg state={del} /></form>}
    </div>
  );
}
