import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "@/lib/theme";

export const tap = () => { void Haptics.selectionAsync().catch(() => undefined); };
export const success = () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); };

// A screen laid out like an app: a title bar, scrolling content, and an optional footer that
// stays pinned at the bottom, where the thumb rests, with the main action in it.
export function AppScreen({ title, left, right, footer, children, scroll = true }: {
  title?: string; left?: React.ReactNode; right?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {(title || left || right) && (
          <View style={s.bar}>
            <View style={{ minWidth: 60 }}>{left}</View>
            <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>{right}</View>
          </View>
        )}
        {scroll ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            {title ? <Text style={s.title} accessibilityRole="header">{title}</Text> : null}
            {!(title || left || right) ? <View style={{ height: 16 }} /> : null}
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>{title ? <Text style={s.title} accessibilityRole="header">{title}</Text> : null}{children}</View>
        )}
        {footer ? <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BarButton({ label, icon, onPress }: { label?: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 }}>
      {icon ? <Ionicons name={icon} size={24} color={colors.ink} /> : null}
      {label ? <Text style={s.barText}>{label}</Text> : null}
    </Pressable>
  );
}

export function Progress({ step, total, label }: { step: number; total: number; label?: string }) {
  return (
    <View style={{ marginBottom: 18 }} accessibilityLabel={`Step ${step} of ${total}`}>
      <View style={s.track}><View style={[s.fill, { width: `${(step / total) * 100}%` }]} /></View>
      <Text style={s.progressText}>Step {step} of {total}{label ? ` · ${label}` : ""}</Text>
    </View>
  );
}

// A large, tappable card with a real photograph. The whole card is the button.
export function PhotoCard({ photo, title, text, onPress, style }: { photo: ImageSource; title: string; text?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      <Image source={photo} style={s.cardPhoto} contentFit="cover" transition={150} />
      <View style={s.cardBody}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{title}</Text>
          {text ? <Text style={s.cardText}>{text}</Text> : null}
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.ink} />
      </View>
    </Pressable>
  );
}

export function ListRow({ title, text, icon, onPress, last }: { title: string; text?: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} accessibilityRole="button" style={({ pressed }) => [s.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.tint }]}>
      {icon ? <Ionicons name={icon} size={22} color={colors.ink} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {text ? <Text style={s.rowText}>{text}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export const Group = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.group, style]}>{children}</View>;
export const GroupLabel = ({ children }: { children: string }) => <Text style={s.groupLabel}>{children}</Text>;

const s = StyleSheet.create({
  bar: { height: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barText: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, letterSpacing: -0.6, color: colors.ink, marginBottom: 16, marginTop: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, gap: 10 },
  track: { height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.ink },
  progressText: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden", ...shadow },
  cardPhoto: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.tint },
  cardBody: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 25, letterSpacing: -0.2, color: colors.ink },
  cardText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 3 },
  group: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden", ...shadow },
  groupLabel: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted, marginBottom: 10, marginTop: 28, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, minHeight: 56, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  rowText: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.muted, marginTop: 2 },
});
