"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import type { AdvocateRequests } from "@/lib/api";
import { respondToAdvocate } from "@/lib/actions";

export function AdvocateRequestPanel({
  matterId,
  requests,
}: {
  matterId: string;
  requests: AdvocateRequests;
}) {
  const pendingRequest = [...requests.requests]
    .reverse()
    .find((request) => !request.answer);
  if (!requests.requests.length) return null;
  return (
    <section className="panel user-advocate-panel">
      <div className="panel-heading">
        <span className="step-number">07</span>
        <div>
          <h2>Messages from your advocate</h2>
          <p className="muted small">Reply with facts you know. It’s okay to say you’re unsure.</p>
        </div>
      </div>
      <div className="request-history">
        {requests.requests.map((request) => (
          <div className="request-thread" key={request.id}>
            <p><MessageSquareText size={15} /> {request.question}</p>
            {request.answer && (
              <div className="request-answer">
                <CheckCircle2 size={14} />
                <span>{request.answer.answer}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {requests.status === "USER_RESPONSE_REQUIRED" && pendingRequest && (
        <ResponseForm matterId={matterId} request={pendingRequest} />
      )}
    </section>
  );
}

function ResponseForm({
  matterId,
  request,
}: {
  matterId: string;
  request: AdvocateRequests["requests"][number];
}) {
  const [state, action, pending] = useActionState(
    respondToAdvocate.bind(null, matterId, request.id),
    {},
  );
  return (
    <form action={action} className="form-stack advocate-response-form">
      <label>
        Your response
        <textarea name="answer" rows={5} minLength={1} maxLength={5000} required />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
        {pending ? "Sending…" : "Send response"}
      </button>
      {state.error && <p className="message error">{state.error}</p>}
      {state.success && <p className="message success">{state.success}</p>}
    </form>
  );
}
