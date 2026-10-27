import React, { createContext, useContext } from "react";
import { ActivityIndicator, ScrollView, TextInputProps, TextStyle, View, ViewStyle, StyleProp } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button as UIButton } from "@/components/primitives/button";
import { Card as UICard } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Text } from "@/components/primitives/text";
import { Textarea } from "@/components/primitives/textarea";
import { colors } from "@/lib/theme";
import { statusLabel, type MatterStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// The app's building blocks, on React Native Reusables (shadcn/ui for React Native) with the
// "Mor & Genda" theme from global.css. Screens use these, not the primitives directly.

export function Screen({ children, scroll = true, padded = true, background = colors.paper }: { children: React.ReactNode; scroll?: boolean; padded?: boolean; background?: string }) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={[padded && { padding: 20, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {children}
    </ScrollView>
  ) : <View style={[{ flex: 1 }, padded && { padding: 20 }]}>{children}</View>;
  return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: background }}>{body}</SafeAreaView>;
}

export const H1 = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <Text maxFontSizeMultiplier={1.3} className={cn("mb-2 font-display text-[26px] leading-[30px] tracking-tight text-foreground", light && "text-white")}>{children}</Text>
);
export const H2 = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <Text maxFontSizeMultiplier={1.3} className={cn("mb-1 font-display-bold text-lg leading-[23px] tracking-tight text-foreground", light && "text-white")}>{children}</Text>
);
export const Body = ({ children, muted, small, style }: { children: React.ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) => (
  <Text style={style} className={cn("font-sans text-[15px] leading-[23px] text-foreground", muted && "text-muted-foreground", small && "text-[13px] leading-5")}>{children}</Text>
);
export const Eyebrow = ({ children }: { children: React.ReactNode; gold?: boolean }) => (
  <Text className="mb-2 font-sans-bold text-[11px] uppercase tracking-wider text-muted-foreground">{children}</Text>
);

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
const variantMap = { primary: "default", gold: "default", outline: "outline", ghost: "ghost", danger: "destructive" } as const;
const iconColor: Record<Variant, string> = { primary: "#fff", gold: "#fff", outline: colors.ink, ghost: colors.ink, danger: "#fff" };

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, iconAfter, style }: {
  title: string; onPress?: () => void; variant?: Variant;
  loading?: boolean; disabled?: boolean; icon?: keyof typeof Feather.glyphMap; iconAfter?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const fg = iconColor[variant];
  return (
    <UIButton
      variant={variantMap[variant]}
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
      className={cn(
        "h-auto min-h-12 rounded-lg px-5 py-3",
        variant === "outline" && "border-foreground bg-transparent",
        disabled && "opacity-50",
      )}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon && !iconAfter ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text className="font-sans-bold text-base">{title}</Text>
      {!loading && icon && iconAfter ? <Feather name={icon} size={20} color={fg} /> : null}
    </UIButton>
  );
}

export function Field({ label, note, ...props }: TextInputProps & { label: string; note?: string }) {
  const Control = props.multiline ? Textarea : Input;
  return (
    <View className="mb-4 gap-1.5">
      <Label nativeID={label} className="font-sans-bold text-[13px] text-foreground">{label}</Label>
      <Control
        aria-labelledby={label}
        placeholderTextColor={colors.faint}
        {...props}
        className={cn("rounded-lg bg-card font-sans text-base text-foreground", props.multiline ? "min-h-[110px]" : "h-12")}
      />
      {note ? <Text className="font-sans text-xs text-muted-foreground">{note}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <UICard style={style} className="mb-4 gap-0 rounded-xl p-[18px]">{children}</UICard>;
}

// Inside the matter stepper the step row already shows the title, so panels hide their own.
export const PanelHeaderVisible = createContext(true);

export function PanelHeader({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  const visible = useContext(PanelHeaderVisible);
  if (!visible) return subtitle ? <Text className="mb-3 font-sans text-sm text-muted-foreground">{subtitle}</Text> : null;
  return (
    <View className="mb-3.5 flex-row items-start gap-3">
      <Text maxFontSizeMultiplier={1.3} className="min-w-7 font-display-bold text-[21px] leading-7 text-mor">{step}</Text>
      <View className="flex-1">
        <Text maxFontSizeMultiplier={1.3} className="mb-1 font-display-bold text-lg leading-[23px] text-foreground">{title}</Text>
        {subtitle ? <Text className="font-sans text-sm text-muted-foreground">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  const bad = !!error;
  return (
    <View className={cn("mt-2.5 flex-row items-start gap-2 rounded-lg p-3", bad ? "bg-[#ffdad6]" : "bg-mor-tint")}>
      <Feather name={bad ? "alert-circle" : "check-circle"} size={18} color={bad ? colors.danger : colors.morInk} />
      <Text className={cn("flex-1 font-sans text-[13px] leading-5", bad ? "text-destructive" : "text-mor-ink")}>{error || success}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: MatterStatus }) {
  const done = status === "COMPLETED" || status === "APPROVED";
  const action = status === "USER_RESPONSE_REQUIRED" || status === "READY_FOR_PAYMENT" || status === "PAYMENT_VERIFICATION";
  return (
    <View className={cn("self-start rounded-full px-2.5 py-0.5", done ? "bg-mor-tint" : action ? "bg-genda-tint" : "bg-muted")}>
      <Text className={cn("font-sans-medium text-[13px]", done ? "text-mor-ink" : action ? "text-genda-ink" : "text-foreground")}>{statusLabel[status]}</Text>
    </View>
  );
}

export function Loading() {
  return <View className="items-center p-10"><ActivityIndicator color={colors.navy} /></View>;
}
