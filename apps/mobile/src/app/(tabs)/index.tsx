import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Card, Eyebrow, H1, Loading, Message, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { Matter } from "@/lib/types";

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

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Eyebrow>A CLEARER WAY FORWARD</Eyebrow>
        <H1>Hello, {user?.fullName.split(" ")[0]}.</H1>
        <Body muted style={{ marginBottom: 22 }}>Your matters, your progress, all in one place.</Body>
        <Message error={error} />
        {!matters && !error ? <Loading /> : null}
        {matters && matters.length === 0 && (
          <Card style={{ alignItems: "center", paddingVertical: 32 }}>
            <Ionicons name="document-text-outline" size={36} color={colors.gold} />
            <Text style={[s.title, { marginTop: 10 }]}>No matters yet</Text>
            <Body muted style={{ textAlign: "center", marginBottom: 18 }}>Start a legal notice or an RTI application. We guide you step by step.</Body>
            <Button title="Start a matter" icon="add" onPress={() => router.push("/new")} />
          </Card>
        )}
        {matters?.map((m) => (
          <Link key={m.id} href={{ pathname: "/matter/[id]", params: { id: m.id } }} asChild>
            <Pressable>
              <Card style={{ gap: 10 }}>
                <View style={s.row}>
                  <View style={s.icon}><Ionicons name={m.type === "RTI" ? "business-outline" : "hammer-outline"} size={20} color={colors.gold2} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{m.type === "RTI" ? "RTI application" : "Legal notice"}</Text>
                    <Text style={s.ref}>{m.referenceNumber} · {shortDate(m.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9aa3b5" />
                </View>
                <StatusBadge status={m.status} />
              </Card>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  ref: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted, marginTop: 2 },
});
