import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { tap } from "@/components/app-ui";
import { Faq } from "@/components/marketing";
import { useAppTheme, type Palette } from "@/lib/app-theme";
import { WEB_URL, WHATSAPP_DISPLAY, WHATSAPP_LINK } from "@/lib/links";
import { fonts } from "@/lib/theme";

type Icon = keyof typeof Feather.glyphMap;

const faqs = [
  { q: "Is this legal advice?", a: "No. Lawmedy prepares documents and an advocate reviews each one. For a large or complicated dispute, speak to an advocate before you send anything." },
  { q: "Do I need documents to start?", a: "No. You can begin with your own account. Documents make the draft more exact." },
  { q: "Do you send it for me?", a: "No. You get a PDF and you send it. For an RTI application, you pay the government fee directly to the authority." },
  { q: "How long does it take?", a: "Usually within 24 hours of verified payment and complete information. Razorpay payments are confirmed securely." },
  { q: "What if you cannot take my matter?", a: "If our advocate declines a matter, you get a full refund." },
  { q: "Can I delete my data?", a: "Yes. After you create an account, open Account and choose Delete my account." },
];

function Row({ icon, title, text, onPress, last }: { icon: Icon; title: string; text?: string; onPress: () => void; last?: boolean }) {
  const { c } = useAppTheme();
  const s = styles(c);
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { backgroundColor: c.surface2 }]}>
      <View style={s.rowIcon}><Feather name={icon} size={18} color={c.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {text ? <Text style={s.rowText}>{text}</Text> : null}
      </View>
      <Feather name="chevron-right" size={18} color={c.muted} />
    </Pressable>
  );
}

export default function Help() {
  const router = useRouter();
  const { c } = useAppTheme();
  const s = styles(c);
  const open = (path: string) => Linking.openURL(`${WEB_URL}${path}`);


  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={s.bar}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>Help</Text>
        <Pressable onPress={() => { tap(); router.push("/login"); }} accessibilityRole="button" style={s.login} hitSlop={6}>
          <Text style={s.loginText}>Log in</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}>
        <View style={s.pair}>
          <Pressable onPress={() => { tap(); router.push("/how-it-works"); }} accessibilityRole="button" style={({ pressed }) => [s.tile, pressed && { borderColor: c.accent }]}>
            <View style={s.rowIcon}><Feather name="list" size={18} color={c.accent} /></View>
            <Text style={s.tileTitle}>How it works</Text>
            <Text style={s.rowText}>From your words to a reviewed PDF</Text>
          </Pressable>
          <Pressable onPress={() => { tap(); router.push("/sample"); }} accessibilityRole="button" style={({ pressed }) => [s.tile, pressed && { borderColor: c.accent }]}>
            <View style={s.rowIcon}><Feather name="file-text" size={18} color={c.accent} /></View>
            <Text style={s.tileTitle}>See a sample notice</Text>
            <Text style={s.rowText}>What the final PDF looks like</Text>
          </Pressable>
        </View>

        <Text style={s.label}>Questions</Text>
        <Faq items={faqs} />

        <Text style={s.label}>Contact and policies</Text>
        <View style={s.card}>
          <Row icon="message-circle" title="WhatsApp us" text={WHATSAPP_DISPLAY} onPress={() => Linking.openURL(WHATSAPP_LINK)} />
          <Row icon="mail" title="Contact and support" onPress={() => open("/contact")} />
          <Row icon="shield" title="Privacy policy" onPress={() => open("/privacy")} />
          <Row icon="book-open" title="Terms of use" onPress={() => open("/terms")} />
          <Row icon="credit-card" title="Refund policy" onPress={() => open("/refunds")} />
          <Row icon="image" title="Photo credits" onPress={() => router.push("/credits")} last />
        </View>

        <Text style={s.label}>Are you an advocate?</Text>
        <View style={s.card}>
          <Row icon="briefcase" title="Join the advocate portal" text="It opens soon. Register your interest and we’ll reach out." onPress={() => router.push("/advocate-portal")} last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c: Palette) => StyleSheet.create({
  bar: { height: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: c.ink },
  login: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  loginText: { fontFamily: fonts.sansBold, fontSize: 15, color: c.accentInk },
  pair: { flexDirection: "row", gap: 10, marginTop: 4 },
  tile: { flex: 1, gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  tileTitle: { fontFamily: fonts.displayBold, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.2, color: c.ink },
  label: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: c.ink, marginTop: 16 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.sansBold, fontSize: 15.5, color: c.ink },
  rowText: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: c.muted, marginTop: 1 },
});
