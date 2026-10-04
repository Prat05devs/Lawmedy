import React, { createContext, useContext } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle, StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "@/lib/theme";
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
  <Text style={[s.h1, light && { color: colors.card }]}>{children}</Text>
);
export const H2 = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <Text style={[s.h2, light && { color: colors.card }]}>{children}</Text>
);
export const Body = ({ children, muted, small, style }: { children: React.ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) => (
  <Text style={[s.body, muted && { color: colors.muted }, small && { fontSize: 13 }, style]}>{children}</Text>
);
export const Eyebrow = ({ children }: { children: React.ReactNode; gold?: boolean }) => (
  <Text style={s.eyebrow}>{children}</Text>
);

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, iconAfter, style }: {
  title: string; onPress?: () => void; variant?: "primary" | "gold" | "outline" | "ghost" | "danger";
  loading?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; iconAfter?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "primary" ? colors.ink : variant === "gold" ? colors.gold : variant === "danger" ? colors.danger : "transparent";
  const fg = variant === "outline" || variant === "ghost" ? colors.navy : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, borderColor: variant === "outline" ? colors.ink : bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon && !iconAfter ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
      {!loading && icon && iconAfter ? <Ionicons name={icon} size={20} color={fg} /> : null}
    </Pressable>
  );
}

export function Field({ label, note, ...props }: TextInputProps & { label: string; note?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
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

// Inside the matter stepper the step row already shows the title, so panels hide their own.
export const PanelHeaderVisible = createContext(true);

export function PanelHeader({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  const visible = useContext(PanelHeaderVisible);
  if (!visible) return subtitle ? <Text style={[s.body, { color: colors.muted, fontSize: 14, marginBottom: 12 }]}>{subtitle}</Text> : null;
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
      <Text style={s.stepNum}>{step}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.h2}>{title}</Text>
        {subtitle ? <Text style={[s.body, { color: colors.muted, fontSize: 14 }]}>{subtitle}</Text> : null}
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
  const action = status === "USER_RESPONSE_REQUIRED" || status === "READY_FOR_PAYMENT" || status === "PAYMENT_VERIFICATION";
  const fg = done ? colors.ok : action ? colors.warnText : colors.ink;
  const border = done ? "#b9cdbf" : action ? "#d9c9a0" : colors.line;
  return (
    <View style={[s.badge, { borderColor: border }]}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: fg }}>{statusLabel[status]}</Text>
    </View>
  );
}

export function Loading() {
  return <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator color={colors.navy} /></View>;
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.ink, letterSpacing: -0.6, marginBottom: 8 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28, color: colors.ink, letterSpacing: -0.2, marginBottom: 4 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.ink },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted, marginBottom: 8 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.sm, borderWidth: 1 },
  buttonText: { fontFamily: fonts.sansBold, fontSize: 16, letterSpacing: -0.1 },
  label: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink, marginBottom: 6 },
  input: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, backgroundColor: colors.card, borderWidth: 1, borderColor: "#c7c7c0", borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13 },
  note: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 5 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 16, ...shadow },
  stepNum: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, color: colors.gold, minWidth: 28 },
  message: { flexDirection: "row", gap: 8, padding: 12, borderRadius: radius.sm, marginTop: 10, alignItems: "flex-start" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
});
