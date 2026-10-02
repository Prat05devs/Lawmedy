import React, { useState } from "react";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import type { AdvocateRequests } from "@/lib/types";

export function AdvocatePanel({ matterId, data, step, onChanged }: { matterId: string; data: AdvocateRequests; step: string; onChanged: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  if (data.requests.length === 0) return null;

  async function send(questionId: string) {
    const answer = (answers[questionId] ?? "").trim();
    if (!answer) return setError("Please write your answer first.");
    setBusy(questionId); setError(""); setOk("");
    try { await post(`/matters/${matterId}/advocate-response`, { questionId, answer }); setOk("Your response has been sent to the advocate."); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(null); }
  }

  return (
    <Card>
      <PanelHeader step={step} title="Questions from our advocate" subtitle="A few details will help finish your document." />
      {data.requests.map((r) => (
        <React.Fragment key={r.id}>
          <Body style={{ marginBottom: 8 }}>{r.question}</Body>
          {r.answer ? <Message success={`You answered: ${r.answer.answer}`} /> : (
            <>
              <Field label="" multiline value={answers[r.id] ?? ""} onChangeText={(t) => setAnswers((p) => ({ ...p, [r.id]: t }))} placeholder="Your answer" style={{ minHeight: 90 }} />
              <Button title="Send to advocate" onPress={() => send(r.id)} loading={busy === r.id} />
            </>
          )}
        </React.Fragment>
      ))}
      <Message error={error} success={ok} />
    </Card>
  );
}
