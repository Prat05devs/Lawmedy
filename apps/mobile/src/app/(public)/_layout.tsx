import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { hasFlag } from "@/lib/device-flags";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

const icon = (name: keyof typeof Feather.glyphMap) => ({ color, size }: { color: string | import("react-native").OpaqueColorValue; size: number }) => <Feather name={name} color={color as string} size={size} />;

export default function PublicTabs() {
  const router = useRouter();
  // First launch: a short, skippable introduction before anything else.
  useEffect(() => { if (!hasFlag("intro-seen")) router.replace("/onboarding"); }, [router]);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.faint, tabBarLabelStyle: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: -0.1 }, tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="start" options={{ title: "Start", tabBarIcon: icon("edit") }} />
      <Tabs.Screen name="help" options={{ title: "Help", tabBarIcon: icon("help-circle") }} />
    </Tabs>
  );
}
