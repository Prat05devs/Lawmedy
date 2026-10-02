import React from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle, StyleProp,
} from "react-native";
import { Image, ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/lib/theme";
import { statusLabel, type MatterStatus } from "@/lib/types";

export function Screen({ children, scroll = true, padded = true, background = colors.paper }: { children: React.ReactNode; scroll?: boolean; padded?: boolean; background?: string }) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={[padded && { padding: 20, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {children}
    </ScrollView>
  ) : <View style={[{ flex: 1 }, padded && { padding: 20 }]}>{children}</View>;
  return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: background }}>{body}</SafeAreaView>;
}

export const H1 = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <Text style={[s.h1, light && { color: "#fff" }]}>{children}</Text>
);
export const H2 = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <Text style={[s.h2, light && { color: "#fff" }]}>{children}</Text>
);
export const Body = ({ children, muted, small, style }: { children: React.ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) => (
  <Text style={[s.body, muted && { color: colors.muted }, small && { fontSize: 13 }, style]}>{children}</Text>
);
export const Eyebrow = ({ children, gold }: { children: React.ReactNode; gold?: boolean }) => (
  <Text style={[s.eyebrow, gold && { color: colors.gold2 }]}>{children}</Text>
);

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style }: {
  title: string; onPress?: () => void; variant?: "primary" | "gold" | "outline" | "ghost" | "danger";
  loading?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "primary" ? colors.navy : variant === "gold" ? colors.gold : variant === "danger" ? colors.danger : "transparent";
  const fg = variant === "outline" || variant === "ghost" ? colors.navy : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, borderColor: variant === "outline" ? colors.line : bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, note, ...props }: TextInputProps & { label: string; note?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#9aa3b5"
        {...props}
        style={[s.input, props.multiline && { minHeight: 110, textAlignVertical: "top" }, props.style]}
      />
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function PanelHeader({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "center" }}>
      <View style={s.step}><Text style={s.stepText}>{step}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.h2}>{title}</Text>
        {subtitle ? <Text style={[s.body, { color: colors.muted, fontSize: 13 }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  const bad = !!error;
  return (
    <View style={[s.message, { backgroundColor: bad ? colors.dangerBg : colors.okBg }]}>
      <Ionicons name={bad ? "alert-circle" : "checkmark-circle"} size={18} color={bad ? colors.danger : colors.ok} />
      <Text style={[s.body, { flex: 1, color: bad ? colors.danger : colors.ok, fontSize: 13 }]}>{error || success}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: MatterStatus }) {
  const done = status === "COMPLETED" || status === "APPROVED";
  const action = status === "USER_RESPONSE_REQUIRED" || status === "READY_FOR_PAYMENT";
  const bg = done ? colors.okBg : action ? colors.warnBg : "#e9eef7";
  const fg = done ? colors.ok : action ? "#8a6414" : colors.navy2;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: fg }}>{statusLabel[status]}</Text>
    </View>
  );
}

export function PhotoBanner({ source, eyebrow, title, height = 170 }: { source: ImageSource; eyebrow?: string; title: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: "hidden", marginBottom: 20 }}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["rgba(10,22,50,0.15)", "rgba(10,22,50,0.9)"]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", left: 18, right: 18, bottom: 16 }}>
        {eyebrow ? <Eyebrow gold>{eyebrow}</Eyebrow> : null}
        <Text style={[s.h2, { color: "#fff", fontSize: 24, marginBottom: 0 }]}>{title}</Text>
      </View>
    </View>
  );
}

export function Loading() {
  return <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator color={colors.navy} /></View>;
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink, letterSpacing: -0.8, marginBottom: 8 },
  h2: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.ink, marginBottom: 4 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.ink },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 1.8, color: colors.muted, marginBottom: 8 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, paddingHorizontal: 20, borderRadius: radius.sm + 2, borderWidth: 1 },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: 15 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, marginBottom: 6 },
  input: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm + 2, paddingHorizontal: 14, paddingVertical: 13 },
  note: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 5 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg - 4, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 16 },
  step: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#e9eef7", alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.navy2 },
  message: { flexDirection: "row", gap: 8, padding: 12, borderRadius: radius.sm + 2, marginTop: 10, alignItems: "flex-start" },
  badge: { flexDirection: "row", gap: 6, alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
