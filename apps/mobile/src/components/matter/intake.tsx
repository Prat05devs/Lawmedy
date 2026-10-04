import React, { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { Intake } from "@/lib/types";

export function IntakePanel({ matterId, intake, editable, onChanged }: { matterId: string; intake: Intake; editable: boolean; onChanged: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const a = intake.analysis;

  async function retry() {
    setBusy(true); setError("");
    try { await post(`/matters/${matterId}/intake/retry`, undefined, 80000); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function save() {
    if (!a) return;
    setBusy(true); setError(""); setOk("");
    const list = a.questions.map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? q.answer?.answer ?? "").trim() })).filter((x) => x.answer);
    if (!list.length) { setBusy(false); return setError("Please answer at least one question."); }
    try { await post(`/matters/${matterId}/answers`, { analysisId: a.id, answers: list }); setOk("Your answers are saved."); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <Card>
      <PanelHeader step="02" title="What we understood" subtitle="Check this, then answer what is missing." />
      {intake.status === "RUNNING" && (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><ActivityIndicator color={colors.navy} /><Body muted>Reading your statement…</Body></View>
      )}
      {intake.status === "FAILED" && (
        <>
          <Message error={intake.message || "We could not read your statement just now."} />
          {editable && <Button variant="outline" title="Try again" icon="refresh-cw" onPress={retry} loading={busy} style={{ marginTop: 12 }} />}
        </>
      )}
      {intake.status === "SUCCEEDED" && a && (
        <>
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.5, color: colors.gold, marginBottom: 6 }}>{a.category.replace(/_/g, " ")}</Text>
          <Body style={{ marginBottom: 14 }}>{a.summary}</Body>
          {a.questions.length > 0 && <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.3, color: colors.ink, marginBottom: 10 }}>A few questions</Text>}
          {a.questions.map((q) => (
            <Field key={q.id} label={q.question} editable={editable} multiline value={answers[q.id] ?? q.answer?.answer ?? ""} onChangeText={(t) => setAnswers((p) => ({ ...p, [q.id]: t }))} placeholder="Your answer" style={{ minHeight: 70 }} />
          ))}
          <Message error={error} success={ok} />
          {editable && a.questions.length > 0 && <Button title="Save answers" onPress={save} loading={busy} />}
        </>
      )}
    </Card>
  );
}
