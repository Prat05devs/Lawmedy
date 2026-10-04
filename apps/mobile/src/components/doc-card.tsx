import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { tap } from "@/components/app-ui";
import { photos } from "@/lib/photos";
import { colors, fonts, radius, shadow } from "@/lib/theme";

type Kind = "LEGAL_NOTICE" | "RTI";

// The card for choosing a document. The whole card is the button; the photo shows the document.
export function DocCard({ kind, title, text, onPress }: { kind: Kind; title: string; text?: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <Image source={kind === "RTI" ? photos.rtiCard : photos.legalNoticeCard} style={s.photo} contentFit="cover" transition={150} accessible={false} />
      <View style={s.body}>
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
          {text ? <Text style={s.text}>{text}</Text> : null}
        </View>
        <Feather name="arrow-right" size={20} color={colors.ink} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: "hidden", ...shadow },
  photo: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.tint2 },
  body: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.ink },
  text: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 3 },
});
