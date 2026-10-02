import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { PublicAuthority, RtiDetail } from "@/lib/types";

export function RtiDetailsPanel({ matterId, authorities, details, editable, onChanged }: { matterId: string; authorities: PublicAuthority[]; details: RtiDetail | null; editable: boolean; onChanged: () => void }) {
  const [authorityId, setAuthorityId] = useState(details?.publicAuthorityId ?? "");
  const [department, setDepartment] = useState(details?.department ?? "");
  const [subject, setSubject] = useState(details?.subject ?? "");
  const [from, setFrom] = useState(details?.periodFrom?.slice(0, 10) ?? "");
  const [to, setTo] = useState(details?.periodTo?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const chosen = authorities.find((x) => x.id === authorityId);

  function pick(a: PublicAuthority) { setAuthorityId(a.id); if (!department) setDepartment(a.department); }

  async function save() {
    setError(""); setOk("");
    if (!chosen) return setError("Choose the public authority.");
    if (department.trim().length < 2) return setError("Enter the department.");
    if (subject.trim().length < 3) return setError("Describe the subject in a few words.");
    const date = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !date.test(from)) || (to && !date.test(to))) return setError("Use dates like 2025-04-01.");
    setBusy(true);
    try {
      await post(`/matters/${matterId}/rti-details`, {
        governmentLevel: chosen.governmentLevel, state: chosen.state || undefined, department: department.trim(),
        publicAuthorityId: chosen.id, subject: subject.trim(), periodFrom: from || undefined, periodTo: to || undefined,
      });
      setOk("Your RTI authority and request details are saved."); onChanged();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <Card>
      <PanelHeader step="03" title="Public authority and request" subtitle="Choose the office that holds the records." />
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, marginBottom: 8 }}>Public authority</Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {authorities.map((a) => (
          <Pressable key={a.id} disabled={!editable} onPress={() => pick(a)} style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: a.id === authorityId ? colors.navy : colors.line, backgroundColor: a.id === authorityId ? "#eef2fa" : "#fff" }}>
            <Ionicons name={a.id === authorityId ? "radio-button-on" : "radio-button-off"} size={20} color={colors.navy} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>{a.name}</Text>
              <Body muted small>{a.governmentLevel.toLowerCase()}{a.state ? ` · ${a.state}` : ""}</Body>
            </View>
          </Pressable>
        ))}
      </View>
      <Field label="Department" editable={editable} value={department} onChangeText={setDepartment} placeholder="Department responsible for the records" />
      <Field label="Subject" editable={editable} value={subject} onChangeText={setSubject} placeholder="Short description of the information requested" />
      <Field label="Period from (optional)" editable={editable} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
      <Field label="Period to (optional)" editable={editable} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
      <Message error={error} success={ok} />
      {editable && <Button title="Save RTI details" onPress={save} loading={busy} style={{ marginTop: 10 }} />}
    </Card>
  );
}
