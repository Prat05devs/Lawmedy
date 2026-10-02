import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { Matter, MatterType } from "@/lib/types";

export function StatementPanel({ matter, editable, onChanged }: { matter: Matter; editable: boolean; onChanged: () => void }) {
  const latest = matter.statements.find((x) => x.id === matter.currentStatementId) ?? matter.statements[0];
  const [text, setText] = useState(latest?.statement ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  useEffect(() => { if (latest && !text) setText(latest.statement); }, [latest, text]);
  const rti = matter.type === ("RTI" as MatterType);

  async function save() {
    setError(""); setOk("");
    if (text.trim().length < 20) return setError("Please write a little more so we can understand. A few sentences is plenty.");
    setBusy(true);
    try { await post(`/matters/${matter.id}/statement`, { statement: text }, 80000); setOk("Your statement is saved."); onChanged(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return (
    <Card>
      <PanelHeader step="01" title={rti ? "What do you want to know?" : "Your side of the story"} subtitle={rti ? "Describe the records or decisions you are looking for." : "A clear account is a good place to begin."} />
      {editable ? (
        <>
          <Field label="" value={text} onChangeText={setText} multiline style={{ minHeight: 170 }} placeholder={rti ? "Which office, what records, and for what period?" : "Who was involved? What happened, and when? Any amounts or promises? What outcome do you want?"} />
          <Message error={error} success={ok} />
          <Button title={latest ? "Save and re-check" : "Save and continue"} onPress={save} loading={busy} style={{ marginTop: 12 }} />
          {busy && <Body muted small style={{ marginTop: 8, textAlign: "center" }}>Reading your statement. This can take up to a minute.</Body>}
        </>
      ) : latest ? (
        <View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginBottom: 6 }}>Saved {shortDate(latest.createdAt)}</Text>
          <Body>{latest.statement}</Body>
        </View>
      ) : null}
    </Card>
  );
}
