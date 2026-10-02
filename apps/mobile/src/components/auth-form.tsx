import React, { useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Button, Field, H1, Message } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";
import { photos } from "@/lib/photos";
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <ImageBackground source={photos.courthouse} style={{ paddingTop: insets.top + 24, paddingBottom: 36, paddingHorizontal: 24 }}>
          <LinearGradient colors={["rgba(15,33,71,0.55)", colors.navy]} style={StyleSheet.absoluteFill} />
          <Image source={require("../../assets/logo-light.png")} style={{ width: 150, height: 40 }} contentFit="contain" />
          <Text style={s.kicker}>LEGAL NOTICES & RTI, DONE RIGHT</Text>
          <Text style={s.hero}>Put it in writing. Properly.</Text>
        </ImageBackground>
        <View style={s.sheet}>
          <H1>{mode === "login" ? "Welcome back" : "Create your account"}</H1>
          <Body muted style={{ marginBottom: 22 }}>
            {mode === "login" ? "Log in to continue your matters." : "Start and save your matter. It takes a minute."}
          </Body>
          {mode === "signup" && <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoComplete="name" textContentType="name" />}
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"} />
          <Message error={error} />
          <Button title={mode === "login" ? "Log in" : "Create account"} onPress={submit} loading={busy} icon="arrow-forward" style={{ marginTop: 14 }} />
          {mode === "signup" && (
            <Text style={s.legal}>
              By creating an account you agree to our{" "}
              <Text style={s.link} onPress={() => import("expo-web-browser").then((m) => m.openBrowserAsync(`${WEB_URL}/terms`))}>Terms of Use</Text> and{" "}
              <Text style={s.link} onPress={() => import("expo-web-browser").then((m) => m.openBrowserAsync(`${WEB_URL}/privacy`))}>Privacy Policy</Text>.
            </Text>
          )}
          <Link href={mode === "login" ? "/signup" : "/login"} asChild>
            <Pressable style={{ marginTop: 22, alignItems: "center" }}>
              <Text style={s.switch}>
                {mode === "login" ? "New to Lawmedy? " : "Already have an account? "}
                <Text style={s.link}>{mode === "login" ? "Create an account" : "Log in"}</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kicker: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 2, color: colors.gold2, marginTop: 56 },
  hero: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, color: "#fff", letterSpacing: -1, marginTop: 10 },
  sheet: { flex: 1, backgroundColor: colors.ivory, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48, marginTop: -8 },
  legal: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: colors.muted, marginTop: 14 },
  link: { color: colors.navy2, fontFamily: fonts.sansMedium, textDecorationLine: "underline" },
  switch: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted },
});
