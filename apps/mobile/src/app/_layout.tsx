import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Newsreader_500Medium } from "@expo-google-fonts/newsreader";
import { PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold } from "@expo-google-fonts/public-sans";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

function Routes() {
  const { user, loading } = useAuth();
  if (loading)
    return <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.ink} /></View>;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="resume" />
        <Stack.Screen name="matter/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function Root() {
  const [loaded] = useFonts({ Newsreader_500Medium, PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Routes />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
