import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, ZalandoSansExpanded_400Regular, ZalandoSansExpanded_700Bold, ZalandoSansExpanded_800ExtraBold } from "@expo-google-fonts/zalando-sans-expanded";
import { ZalandoSans_400Regular, ZalandoSans_500Medium, ZalandoSans_600SemiBold } from "@expo-google-fonts/zalando-sans";
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
        <Stack.Screen name="matters" />
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
  const [loaded] = useFonts({ ZalandoSansExpanded_400Regular, ZalandoSansExpanded_700Bold, ZalandoSansExpanded_800ExtraBold, ZalandoSans_400Regular, ZalandoSans_500Medium, ZalandoSans_600SemiBold });
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
