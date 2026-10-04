import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { loadDraft } from "@/lib/guest-draft";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

const icon = (name: keyof typeof Feather.glyphMap) => ({ color, size }: { color: string | import("react-native").OpaqueColorValue; size: number }) => <Feather name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const router = useRouter();
  // Someone who began as a guest and has just signed up: turn their draft into a matter.
  useEffect(() => { void loadDraft().then((draft) => { if (draft) router.replace("/resume"); }); }, [router]);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.faint, tabBarLabelStyle: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: -0.1 }, tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="new" options={{ title: "New", tabBarIcon: icon("plus-circle") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("user") }} />
    </Tabs>
  );
}
