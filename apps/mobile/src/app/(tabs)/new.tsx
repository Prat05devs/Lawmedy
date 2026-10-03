import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, H1, Message, Screen } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { Matter, MatterType } from "@/lib/types";

const options: { type: MatterType; title: string; text: string }[] = [
  { type: "LEGAL_NOTICE", title: "Legal notice", text: "For money owed, a deposit or refund not returned, a broken agreement, or a consumer or property dispute." },
  { type: "RTI", title: "RTI application", text: "A request for records from a public authority under the Right to Information Act." },
];

export default function NewMatter() {
  const router = useRouter();
  const [busy, setBusy] = useState<MatterType | null>(null);
  const [error, setError] = useState("");

  async function start(type: MatterType) {
    setBusy(type); setError("");
    try {
      const matter = await post<Matter>("/matters", { type });
      router.push({ pathname: "/matter/[id]", params: { id: matter.id } });
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <Screen>
      <H1>Start a matter</H1>
      <Body muted style={{ marginBottom: 22 }}>An advocate reviews every document before you receive it.</Body>
      <Message error={error} />
      {options.map((o, i) => (
        <Pressable key={o.type} disabled={!!busy} onPress={() => start(o.type)} style={[s.row, i === 0 && s.first, busy === o.type && { opacity: 0.55 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{o.title}</Text>
            <Body muted small>{o.text}</Body>
          </View>
          <Text style={s.arrow}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  first: { borderTopWidth: 1, borderTopColor: colors.line },
  title: { fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginBottom: 4 },
  arrow: { fontFamily: fonts.sans, fontSize: 28, color: colors.muted },
});
