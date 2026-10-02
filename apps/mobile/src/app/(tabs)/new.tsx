import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Card, Eyebrow, H1, Message, PhotoBanner, Screen } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { photos } from "@/lib/photos";
import { colors, fonts } from "@/lib/theme";
import type { Matter, MatterType } from "@/lib/types";

const options: { type: MatterType; title: string; text: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "LEGAL_NOTICE", title: "Legal notice", text: "For money owed, refunds, deposits, broken agreements, consumer or property disputes.", icon: "hammer-outline" },
  { type: "RTI", title: "RTI application", text: "Ask a public authority for records and decisions under the Right to Information Act.", icon: "business-outline" },
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
      <Eyebrow>START A MATTER</Eyebrow>
      <H1>What do you need?</H1>
      <Body muted style={{ marginBottom: 18 }}>Both documents are reviewed by our in-house advocate before you receive them.</Body>
      <PhotoBanner source={photos.ladyJustice} eyebrow="STEP BY STEP" title="You tell us. We draft. An advocate reviews." height={150} />
      <Message error={error} />
      {options.map((o) => (
        <Pressable key={o.type} disabled={!!busy} onPress={() => start(o.type)}>
          <Card style={[{ flexDirection: "row", gap: 14, alignItems: "center" }, busy === o.type && { opacity: 0.6 }]}>
            <View style={s.icon}><Ionicons name={o.icon} size={24} color={colors.gold2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{o.title}</Text>
              <Body muted small>{o.text}</Body>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.navy} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
const s = StyleSheet.create({
  icon: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink, marginBottom: 4 },
});
