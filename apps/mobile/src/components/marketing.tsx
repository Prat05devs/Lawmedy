import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { colors, fonts, radius } from "@/lib/theme";
import { Body } from "@/components/ui";
import type { Testimonial } from "@/lib/public";

// A miniature of the PDF we produce, with made-up parties, so visitors see the real product.
export function SampleNotice() {
  return (
    <View>
      <View style={s.page} accessibilityLabel="Sample legal notice with fictional names">
        <View style={s.pageHead}><Text style={s.mono}>LAWMEDY</Text><Text style={[s.mono, { textAlign: "right" }]}>Legal notice{"\n"}MAT-2026-000123</Text></View>
        <Text style={s.pageDate}>14 October 2026</Text>
        <Text style={s.pageText}><Text style={s.bold}>From: </Text>Meera Sharma, 21 Rajpur Road, Dehradun</Text>
        <Text style={s.pageText}><Text style={s.bold}>To: </Text>Rakesh Kumar, 5 Market Road, Dehradun</Text>
        <Text style={[s.pageText, { marginVertical: 8 }]}><Text style={s.bold}>Subject: </Text>Notice for repayment of ₹2,00,000 lent on 5 March 2026</Text>
        <Text style={s.pageText}>1. You borrowed ₹2,00,000 from my client on 5 March 2026 by bank transfer, on the promise to repay by 5 June 2026.</Text>
        <Text style={s.pageText}>2. The due date has passed and no part has been repaid.</Text>
        <Text style={s.pageText}>3. My client calls on you to pay ₹2,00,000 within 15 days of receiving this notice, failing which she will take legal action at your cost.</Text>
        <Text style={s.sign}>Reviewed and approved by an advocate</Text>
      </View>
      <Body muted small style={{ marginTop: 8 }}>A sample with made-up names. Yours is written from your own confirmed facts.</Body>
    </View>
  );
}

export function FeatureBlock({ photo, title, text, action, onAction }: { photo: ImageSource; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ marginBottom: 30 }}>
      <Image source={photo} style={s.photo} contentFit="cover" accessibilityIgnoresInvertColors />
      <Text maxFontSizeMultiplier={1.3} style={s.featureTitle}>{title}</Text>
      <Body muted>{text}</Body>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={s.link}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={item.title} style={[s.step, index === 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Text maxFontSizeMultiplier={1.3} style={s.stepNum}>{index + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.stepTitle}>{item.title}</Text>
            <Body muted small>{item.text}</Body>
          </View>
        </View>
      ))}
    </View>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
      {items.map((item, index) => (
        <Pressable key={item.q} onPress={() => setOpen(open === index ? null : index)} style={s.faq} accessibilityRole="button" accessibilityState={{ expanded: open === index }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={s.faqQ}>{item.q}</Text>
            <Text style={s.faqPlus}>{open === index ? "−" : "+"}</Text>
          </View>
          {open === index ? <Body muted style={{ marginTop: 8 }}>{item.a}</Body> : null}
        </Pressable>
      ))}
    </View>
  );
}

// Real customers only. Renders nothing until the admin desk has published some.
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <View style={{ marginBottom: 30 }}>
      <Text maxFontSizeMultiplier={1.3} style={s.sectionTitle}>What customers say</Text>
      {items.map((t) => (
        <View key={t.id} style={s.quote}>
          <Text maxFontSizeMultiplier={1.3} style={s.quoteText}>{t.quote}</Text>
          <Text style={s.quoteBy}>{t.name}{t.descriptor ? `, ${t.descriptor}` : ""}</Text>
        </View>
      ))}
    </View>
  );
}

export const SectionTitle = ({ children }: { children: React.ReactNode }) => <Text maxFontSizeMultiplier={1.3} style={s.sectionTitle}>{children}</Text>;

const s = StyleSheet.create({
  page: { backgroundColor: "#fffefb", borderWidth: 1, borderColor: colors.line, padding: 18 },
  pageHead: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.ink, paddingBottom: 8, marginBottom: 10 },
  mono: { fontFamily: fonts.sans, fontSize: 10.5, letterSpacing: 0.8, color: colors.ink },
  pageDate: { fontFamily: "Georgia", fontSize: 12, textAlign: "right", marginBottom: 6, color: "#25221d" },
  pageText: { fontFamily: "Georgia", fontSize: 12.5, lineHeight: 19, color: "#25221d", marginBottom: 4 },
  bold: { fontWeight: "700" },
  sign: { fontFamily: "Georgia", fontStyle: "italic", fontSize: 12, color: "#5b554a", marginTop: 12 },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.tint, marginBottom: 14 },
  featureTitle: { fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 30, letterSpacing: -0.3, color: colors.ink, marginBottom: 6 },
  link: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink, textDecorationLine: "underline", marginTop: 10 },
  step: { flexDirection: "row", gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  stepNum: { fontFamily: fonts.display, fontSize: 26, lineHeight: 29, letterSpacing: -0.8, color: colors.gold, width: 28 },
  stepTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink, marginBottom: 3 },
  faq: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  faqQ: { fontFamily: fonts.sansBold, fontSize: 15.5, color: colors.ink, flex: 1 },
  faqPlus: { fontFamily: fonts.sans, fontSize: 22, color: colors.ink, lineHeight: 22 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 29, letterSpacing: -0.8, color: colors.ink, marginBottom: 16 },
  quote: { marginBottom: 22 },
  quoteText: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.ink, marginBottom: 8 },
  quoteBy: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted },
});
