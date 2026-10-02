import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string | import("react-native").OpaqueColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.navy, tabBarInactiveTintColor: "#9aa3b5", tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 }, tabBarStyle: { backgroundColor: "#fff", borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={{ title: "Matters", tabBarIcon: icon("folder-open-outline") }} />
      <Tabs.Screen name="new" options={{ title: "New", tabBarIcon: icon("add-circle-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}
