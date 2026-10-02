import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Fraunces_500Medium } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

function Routes() {
  const { user, loading } = useAuth();
  if (loading)
    return <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#fff" /></View>;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="matter/[id]" options={{ headerShown: true, title: "", headerTintColor: colors.navy, headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerBackTitle: "Matters" }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function Root() {
  const [loaded] = useFonts({ Fraunces_500Medium, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
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
