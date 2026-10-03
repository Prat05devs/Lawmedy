import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Group, GroupLabel, PhotoCard, tap } from "@/components/app-ui";
import { Body, Loading, Message, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { courts } from "@/lib/courts";
import { errorMessage, shortDate } from "@/lib/hooks";
import { colors, fonts, radius } from "@/lib/theme";
import { progressNote, type Matter } from "@/lib/types";

const NEEDS_YOU: Matter["status"][] = ["DRAFT", "INTAKE_IN_PROGRESS", "READY_FOR_PAYMENT", "USER_RESPONSE_REQUIRED"];

export default function Matters() {
  const { user } = useAuth();
  const router = useRouter();
  const [matters, setMatters] = useState<Matter[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setMatters(await api<Matter[]>("/matters")); setError(""); }
    catch (e) { setError(errorMessage(e)); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const open = (m: Matter) => { tap(); router.push({ pathname: "/matter/[id]", params: { id: m.id } }); };
  const next = matters?.find((m) => NEEDS_YOU.includes(m.status));

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Text style={s.hello}>Hello, {user?.fullName.split(" ")[0]}</Text>
        <Text style={s.title}>Your matters</Text>
        <Message error={error} />
        {!matters && !error ? <Loading /> : null}

        {matters && matters.length === 0 && (
          <View style={{ gap: 14 }}>
            <Body muted>Nothing here yet. Start with what you need.</Body>
            <PhotoCard photo={courts.bombayHighCourtStreet} title="Send a legal notice" onPress={() => router.push("/new")} />
            <PhotoCard photo={courts.supremeCourtWide} title="File an RTI application" onPress={() => router.push("/new")} />
          </View>
        )}

        {next && (
          <Pressable onPress={() => open(next)} style={s.next} accessibilityRole="button">
            <Text style={s.nextLabel}>Needs you</Text>
            <Text style={s.nextTitle}>{next.type === "RTI" ? "RTI application" : "Legal notice"} · {next.referenceNumber}</Text>
            <Text style={s.nextText}>{progressNote[next.status]}</Text>
            <View style={s.nextGo}><Text style={s.nextGoText}>Continue</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></View>
          </Pressable>
        )}

        {matters && matters.length > 0 && (
          <>
            <GroupLabel>All matters</GroupLabel>
            <Group>
              {matters.map((m, i) => (
                <Pressable key={m.id} onPress={() => open(m)} style={({ pressed }) => [s.row, i === matters.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.tint }]} accessibilityRole="button">
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={s.rowTitle}>{m.type === "RTI" ? "RTI application" : "Legal notice"}</Text>
                    <Text style={s.rowMeta}>{m.referenceNumber} · {shortDate(m.createdAt)}</Text>
                    <StatusBadge status={m.status} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </Group>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hello: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted, marginTop: 8 },
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: colors.ink, marginBottom: 16 },
  next: { backgroundColor: colors.ink, borderRadius: radius.md, padding: 18, marginBottom: 6 },
  nextLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: "#cfc8b8", marginBottom: 6 },
  nextTitle: { fontFamily: fonts.serif, fontSize: 22, color: "#fff", marginBottom: 6 },
  nextText: { fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 21, color: "#e9e3d6" },
  nextGo: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, alignSelf: "flex-start" },
  nextGoText: { fontFamily: fonts.sansBold, fontSize: 15, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowTitle: { fontFamily: fonts.serif, fontSize: 19, color: colors.ink },
  rowMeta: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
});
