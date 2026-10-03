import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Body, Button, Card, H1, Field, Message, Screen } from "@/components/ui";
import { Group, GroupLabel, ListRow } from "@/components/app-ui";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { WEB_URL } from "@/lib/links";
import { colors, fonts } from "@/lib/theme";

const links = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Use", path: "/terms" },
  { label: "Refund Policy", path: "/refunds" },
  { label: "Contact & support", path: "/contact" },
];

export default function Account() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    setBusy(true); setError("");
    try {
      await api("/users/me", { method: "DELETE", body: JSON.stringify({ confirm: word }) });
      await logout();
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }
  return (
    <Screen>
      <H1>{user?.fullName}</H1>
      <Body muted style={{ marginBottom: 22 }}>{user?.email}</Body>
      <Group>
        {links.map((l) => <ListRow key={l.path} title={l.label} onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}${l.path}`)} />)}
        <ListRow title="Photo credits" onPress={() => router.push("/credits")} last />
      </Group>
      <GroupLabel>Account</GroupLabel>
      <Card>
        <Text style={s.label}>Delete your account</Text>
        {!deleting ? (
          <>
            <Body muted small style={{ marginVertical: 6 }}>Permanently erase your matters, statements, uploaded documents and drafts, and close your account. This cannot be undone.</Body>
            <Button variant="outline" title="Delete my account" icon="trash-outline" onPress={() => setDeleting(true)} />
          </>
        ) : (
          <>
            <Body small style={{ marginVertical: 6 }}>This permanently erases everything you added to Lawmedy and closes your account. Download any final PDF you still need first. Payment records we are required to keep are retained without your personal details.</Body>
            <Field label="Type DELETE to confirm" value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" />
            <Message error={error} />
            <Button variant="danger" title="Permanently delete my account" icon="trash" onPress={deleteAccount} loading={busy} disabled={word !== "DELETE"} />
            <Button variant="ghost" title="Cancel" onPress={() => { setDeleting(false); setWord(""); setError(""); }} style={{ marginTop: 8 }} />
          </>
        )}
      </Card>
      <Button variant="outline" title="Log out" icon="log-out-outline" onPress={() => Alert.alert("Log out?", "You can log back in any time.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: () => void logout() }])} />
      <Text style={s.foot}>Lawmedy helps you prepare documents. It is not a substitute for legal advice on complex disputes.</Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  label: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  foot: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 22, lineHeight: 18 },
});
