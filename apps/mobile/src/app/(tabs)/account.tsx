import React from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Body, Button, Card, Eyebrow, H1, Screen } from "@/components/ui";
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
  return (
    <Screen>
      <Eyebrow>YOUR ACCOUNT</Eyebrow>
      <H1>{user?.fullName}</H1>
      <Body muted style={{ marginBottom: 22 }}>{user?.email}</Body>
      <Card style={{ paddingVertical: 6 }}>
        {links.map((l, i) => (
          <Pressable key={l.path} onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}${l.path}`)} style={[s.row, i > 0 && s.border]}>
            <Text style={s.label}>{l.label}</Text>
            <Ionicons name="open-outline" size={17} color="#9aa3b5" />
          </Pressable>
        ))}
      </Card>
      <Card>
        <Text style={s.label}>Delete your account</Text>
        <Body muted small style={{ marginVertical: 6 }}>Ask us to permanently delete your account and everything tied to it. We confirm and complete it within 30 days.</Body>
        <Button variant="outline" title="Request deletion" icon="trash-outline" onPress={() => Linking.openURL(`${WEB_URL}/delete-account`)} />
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
