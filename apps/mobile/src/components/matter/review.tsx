import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { MatterReview } from "@/lib/types";

const label = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const sourceName = { STATEMENT: "Your statement", ANSWER: "Your answer", EVIDENCE: "Your document" } as const;

export function ReviewPanel({ matterId, review, step, onChanged }: { matterId: string; review: MatterReview; step: string; onChanged: () => void }) {
  const locked = !["INTAKE_IN_PROGRESS", "DRAFT"].includes(review.status) && review.status !== "READY_FOR_PAYMENT";
  const editable = review.status === "INTAKE_IN_PROGRESS";
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [address, setAddress] = useState(review.applicant.address ?? "");
  const [phone, setPhone] = useState(review.applicant.phone ?? "");
  const [rName, setRName] = useState(review.recipient?.name ?? "");
  const [rAddress, setRAddress] = useState(review.recipient?.address ?? "");
  const [rPhone, setRPhone] = useState(review.recipient?.phone ?? "");
  const [rEmail, setREmail] = useState(review.recipient?.email ?? "");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const g of review.factGroups) next[g.type] = g.selectedId ?? g.values.find((v) => v.confirmed)?.id ?? (g.conflict ? "" : g.values[0]?.id ?? "");
    setSelected(next);
  }, [review]);

  async function prepare() {
    setBusy(true); setError("");
    try { await post(`/matters/${matterId}/review/prepare`); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function confirm() {
    setError(""); setOk("");
    const missing = review.factGroups.find((g) => !selected[g.type]);
    if (missing) return setError(`Please choose the correct value for “${label(missing.type)}”.`);
    if (address.trim().length < 5) return setError("Please enter your postal address.");
    if (review.matterType === "LEGAL_NOTICE" && (rName.trim().length < 2 || rAddress.trim().length < 5)) return setError("Please enter the other party's name and address.");
    if (!agree) return setError("Please tick the confirmation box.");
    setBusy(true);
    try {
      await post(`/matters/${matterId}/review/confirm`, {
        selections: Object.entries(selected).map(([type, caseFactId]) => ({ type, caseFactId })),
        applicant: { address: address.trim(), phone: phone.trim() || undefined },
        ...(review.matterType === "LEGAL_NOTICE" ? { recipient: { name: rName.trim(), address: rAddress.trim(), phone: rPhone.trim() || undefined, email: rEmail.trim() || undefined } } : {}),
        confirmed: true,
      });
      setOk("Your case information is confirmed."); onChanged();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  if (review.status === "DRAFT") return null;
  return (
    <Card>
      <PanelHeader step={step} title="Review and confirm" subtitle="Every fact below is checked against its source. Only what you confirm goes into the draft." />
      {!review.prepared && editable ? (
        <>
          <Body muted style={{ marginBottom: 12 }}>When you are done with the questions and documents, gather your facts to review.</Body>
          <Button title="Prepare my facts" icon="sparkles-outline" onPress={prepare} loading={busy} />
        </>
      ) : (
        <>
          {review.factGroups.map((g) => (
            <View key={g.type} style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1, color: g.conflict ? colors.danger : colors.muted, marginBottom: 6 }}>
                {label(g.type).toUpperCase()}{g.conflict ? "  ·  SOURCES DISAGREE" : ""}
              </Text>
              {g.values.map((v) => {
                const on = selected[g.type] === v.id;
                return (
                  <Pressable key={v.id} disabled={!editable} onPress={() => setSelected((p) => ({ ...p, [g.type]: v.id }))} style={{ flexDirection: "row", gap: 10, padding: 12, marginBottom: 6, borderRadius: 12, borderWidth: 1.5, borderColor: on ? colors.navy : colors.line, backgroundColor: on ? "#eef2fa" : "#fff" }}>
                    <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={colors.navy} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.ink }}>{v.value}</Text>
                      <Body muted small>{sourceName[v.source]} · {v.sourceLabel}</Body>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Text style={{ fontFamily: fonts.serif, fontSize: 17, color: colors.ink, marginBottom: 10 }}>Your contact details</Text>
          <Field label="Your postal address" editable={editable} multiline value={address} onChangeText={setAddress} placeholder="So the reply reaches you" style={{ minHeight: 80 }} />
          <Field label="Phone (optional)" editable={editable} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91" />
          {review.matterType === "LEGAL_NOTICE" && (
            <>
              <Text style={{ fontFamily: fonts.serif, fontSize: 17, color: colors.ink, marginBottom: 10 }}>The other party</Text>
              <Field label="Name" editable={editable} value={rName} onChangeText={setRName} placeholder="Person or company" />
              <Field label="Address" editable={editable} multiline value={rAddress} onChangeText={setRAddress} placeholder="Where the notice will be sent" style={{ minHeight: 80 }} />
              <Field label="Phone (optional)" editable={editable} value={rPhone} onChangeText={setRPhone} keyboardType="phone-pad" />
              <Field label="Email (optional)" editable={editable} value={rEmail} onChangeText={setREmail} keyboardType="email-address" autoCapitalize="none" />
            </>
          )}
          {editable && (
            <Pressable onPress={() => setAgree((v) => !v)} style={{ flexDirection: "row", gap: 10, marginVertical: 10 }}>
              <Ionicons name={agree ? "checkbox" : "square-outline"} size={24} color={colors.navy} />
              <Body style={{ flex: 1, fontSize: 14 }}>I have checked these facts and confirm they are accurate to the best of my knowledge.</Body>
            </Pressable>
          )}
          <Message error={error} success={ok} />
          {editable && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button title="Confirm facts" onPress={confirm} loading={busy} disabled={review.factGroups.length === 0} />
              <Button variant="outline" title="Re-gather facts" onPress={prepare} disabled={busy} />
            </View>
          )}
          {locked && <Body muted small>These facts are confirmed and locked.</Body>}
        </>
      )}
    </Card>
  );
}
