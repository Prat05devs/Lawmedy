import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, H1, Loading, Message, StatusBadge } from "@/components/ui";
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
        <H1>Hello, {user?.fullName.split(" ")[0]}</H1>
        <Body muted style={{ marginBottom: 20 }}>
          {matters && matters.length > 0 ? `${matters.length} ${matters.length === 1 ? "matter" : "matters"}` : "You have not started a matter yet."}
        </Body>
        <Message error={error} />
        {!matters && !error ? <Loading /> : null}
        {matters && matters.length === 0 && (
          <View style={{ gap: 14 }}>
            <Body>Write what happened in your own words. You confirm every fact before anything is drafted.</Body>
            <Button title="Start a matter" onPress={() => router.push("/new")} />
          </View>
        )}
        {matters && matters.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
            {matters.map((m) => (
              <Link key={m.id} href={{ pathname: "/matter/[id]", params: { id: m.id } }} asChild>
                <Pressable style={s.row}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={s.title}>{m.type === "RTI" ? "RTI application" : "Legal notice"}</Text>
                    <Text style={s.ref}>{m.referenceNumber} · {shortDate(m.createdAt)}</Text>
                    <StatusBadge status={m.status} />
                  </View>
                  <Text style={s.arrow}>›</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  ref: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  arrow: { fontFamily: fonts.sans, fontSize: 28, color: colors.muted },
});
