import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Group, tap } from "@/components/app-ui";
import { StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/hooks";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { progressNote, type Matter } from "@/lib/types";

export const NEEDS_YOU: Matter["status"][] = ["DRAFT", "INTAKE_IN_PROGRESS", "READY_FOR_PAYMENT", "USER_RESPONSE_REQUIRED"];

// The signed-in user's matters, reloaded whenever the screen comes into focus.
export function useMatters() {
  const [matters, setMatters] = useState<Matter[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setMatters(await api<Matter[]>("/matters")); setError(""); }
    catch (e) { setError(errorMessage(e)); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return { matters, error, load };
}

export function NeedsYouCard({ matter }: { matter: Matter }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => { tap(); router.push({ pathname: "/matter/[id]", params: { id: matter.id } }); }} style={({ pressed }) => [s.next, pressed && { opacity: 0.92 }]} accessibilityRole="button">
      <Text style={s.nextLabel}>Needs you</Text>
      <Text maxFontSizeMultiplier={1.3} style={s.nextTitle}>{matter.type === "RTI" ? "RTI application" : "Legal notice"} · {matter.referenceNumber}</Text>
      <Text style={s.nextText}>{progressNote[matter.status]}</Text>
      <View style={s.nextGo}><Text style={s.nextGoText}>Continue</Text><Feather name="arrow-right" size={18} color="#fff" /></View>
    </Pressable>
  );
}

export function MatterList({ matters }: { matters: Matter[] }) {
  const router = useRouter();
  return (
    <Group>
      {matters.map((m, i) => (
        <Pressable key={m.id} onPress={() => { tap(); router.push({ pathname: "/matter/[id]", params: { id: m.id } }); }} style={({ pressed }) => [s.row, i === matters.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.tint }]} accessibilityRole="button">
          <View style={{ flex: 1, gap: 6 }}>
            <Text maxFontSizeMultiplier={1.3} style={s.rowTitle}>{m.type === "RTI" ? "RTI application" : "Legal notice"}</Text>
            <Text style={s.rowMeta}>{m.referenceNumber} · {shortDate(m.createdAt)}</Text>
            <StatusBadge status={m.status} />
          </View>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </Group>
  );
}

const s = StyleSheet.create({
  next: { backgroundColor: colors.ink, borderRadius: radius.md, padding: 18, ...shadow },
  nextLabel: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: "#c9c6c4", marginBottom: 6 },
  nextTitle: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3, color: "#fff", marginBottom: 6 },
  nextText: { fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 21, color: "#e6e4e2" },
  nextGo: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, alignSelf: "flex-start" },
  nextGoText: { fontFamily: fonts.sansBold, fontSize: 15, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowTitle: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.ink },
  rowMeta: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
});
