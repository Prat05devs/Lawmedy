import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Button, Field, H1, Message } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";
import { errorMessage } from "@/lib/hooks";
import { WEB_URL } from "@/lib/links";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (mode === "signup" && fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!email.includes("@")) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Your password needs at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(fullName, email, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Image source={require("../../assets/logo-dark.png")} style={{ width: 140, height: 38, marginBottom: 40 }} contentFit="contain" contentPosition="left" />
        <H1>{mode === "login" ? "Log in" : "Create your account"}</H1>
        <Body muted style={{ marginBottom: 24 }}>
          {mode === "login" ? "Continue where you left off." : "You need an account to save your matter."}
        </Body>
        {mode === "signup" && <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoComplete="name" textContentType="name" />}
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"} />
        <Message error={error} />
        <Button title={mode === "login" ? "Log in" : "Create account"} onPress={submit} loading={busy} style={{ marginTop: 14 }} />
        {mode === "signup" && (
          <Text style={s.legal}>
            By creating an account you agree to our{" "}
            <Text style={s.link} onPress={() => import("expo-web-browser").then((m) => m.openBrowserAsync(`${WEB_URL}/terms`))}>Terms of Use</Text> and{" "}
            <Text style={s.link} onPress={() => import("expo-web-browser").then((m) => m.openBrowserAsync(`${WEB_URL}/privacy`))}>Privacy Policy</Text>.
          </Text>
        )}
        <Link href={mode === "login" ? "/signup" : "/login"} asChild>
          <Pressable style={{ marginTop: 26 }}>
            <Text style={s.switch}>
              {mode === "login" ? "New to Lawmedy? " : "Already have an account? "}
              <Text style={s.link}>{mode === "login" ? "Create an account" : "Log in"}</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  legal: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 14 },
  link: { color: colors.ink, fontFamily: fonts.sansMedium, textDecorationLine: "underline" },
  switch: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted },
});
