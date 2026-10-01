"use client";
import { useActionState } from "react";
import { Building2, LoaderCircle, Save } from "lucide-react";
import { saveRtiDetails } from "@/lib/actions";
import type { PublicAuthority, RtiDetail } from "@/lib/api";

export function RtiDetailsPanel({ matterId, authorities, details, readOnly }: { matterId: string; authorities: PublicAuthority[]; details: RtiDetail | null; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveRtiDetails.bind(null, matterId), {});
  return <section className="panel"><div className="panel-heading"><span className="step-number">03</span><div><h2>Public authority and request</h2><p className="muted small">Choose the office that holds the records and define the request.</p></div></div>
    <form action={action} className="form-stack">
      <label>Public authority<select name="publicAuthorityId" required disabled={readOnly} defaultValue={details?.publicAuthorityId ?? ""}><option value="" disabled>Select an authority</option>{authorities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.governmentLevel.toLowerCase()}</option>)}</select></label>
      <div className="recipient-grid"><label>Government level<select name="governmentLevel" required disabled={readOnly} defaultValue={details?.governmentLevel ?? "CENTRAL"}><option value="CENTRAL">Central</option><option value="STATE">State</option><option value="LOCAL">Local</option></select></label><label>State <span className="muted small">If applicable</span><input name="state" disabled={readOnly} defaultValue={details?.state ?? ""} /></label></div>
      <label>Department<input name="department" required minLength={2} maxLength={300} disabled={readOnly} defaultValue={details?.department ?? ""} placeholder="Department responsible for the records" /></label>
      <label>Subject<input name="subject" required minLength={3} maxLength={1000} disabled={readOnly} defaultValue={details?.subject ?? ""} placeholder="Short description of the information requested" /></label>
      <div className="recipient-grid"><label>Period from <span className="muted small">Optional</span><input type="date" name="periodFrom" disabled={readOnly} defaultValue={details?.periodFrom?.slice(0,10) ?? ""} /></label><label>Period to <span className="muted small">Optional</span><input type="date" name="periodTo" disabled={readOnly} defaultValue={details?.periodTo?.slice(0,10) ?? ""} /></label></div>
      {!readOnly && <button className="button primary" disabled={pending}>{pending ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} {pending ? "Saving…" : "Save RTI details"}</button>}
      {state.error && <p className="message error">{state.error}</p>}{state.success && <p className="message success"><Building2 size={17}/>{state.success}</p>}
    </form></section>;
}
