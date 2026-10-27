import React, { useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { tap } from "@/components/app-ui";
import { AssistantButton, AssistantSheet } from "@/components/assistant";
import { saveDraft } from "@/lib/guest-draft";
import { services, servicePrice } from "@/lib/services";
import { WEB_URL } from "@/lib/links";
import { photos } from "@/lib/photos";
import { usePublic, type Pricing, type Testimonial } from "@/lib/public";
import type { AssistantAction } from "@/lib/assistant";
import type { MatterType } from "@/lib/types";
import { scenarios } from "@/lib/scenarios";
import { band, useAppTheme, type Palette } from "@/lib/app-theme";
import { fonts } from "@/lib/theme";

const steps: { title: string; text: string }[] = [
  { title: "Describe the problem", text: "A few plain sentences are enough. We ask only for what’s missing." },
  { title: "Add what you already have", text: "Agreements, receipts, transfers, screenshots." },
  { title: "Confirm every fact", text: "Each date and amount is shown next to where it came from. You choose." },
  { title: "Pay securely", text: "Work starts once the payment is verified." },
  { title: "Draft, review, download", text: "An advocate edits and approves it. Usually within 24 hours of verified payment." },
];

// Signed-in extras for the shared home page: who is signed in, how "start" works for them, and
// a section shown above everything else (their matters).
export type SignedIn = { name: string; onStart: (type?: MatterType, story?: string) => void; top?: React.ReactNode };

// The main page. Everyone sees the same home, signed in or not; signed-in people also see their
// matters at the top, and starting a document creates a matter instead of the guest quick check.
export function HomeScreen({ signedIn }: { signedIn?: SignedIn }) {
  const router = useRouter();
  const { mode, c, toggle } = useAppTheme();
  const s = styles(c);
  const pricing = usePublic<Pricing | null>("/public/pricing", null);
  const testimonials = usePublic<Testimonial[]>("/public/testimonials", []);
  const price = servicePrice(pricing, "LEGAL_NOTICE");
  const rtiPrice = servicePrice(pricing, "RTI");
  const [chat, setChat] = useState(false);
  const [story, setStory] = useState("");
  const start = (type?: MatterType, statement?: string) => {
    if (signedIn) return signedIn.onStart(type, statement);
    if (!type) return router.push("/start");
    if (statement) saveDraft({ type, statement });
    router.push({ pathname: "/start", params: { type, ...(statement ? { draftKey: String(Date.now()) } : {}) } });
  };
  const initials = signedIn?.name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const act = (to: AssistantAction) => {
    setChat(false);
    if (to === "contact") return void WebBrowser.openBrowserAsync(`${WEB_URL}/contact`);
    setTimeout(() => {
      if (to === "notice") start("LEGAL_NOTICE");
      else if (to === "rti") start("RTI");
      else router.push(to === "sample" ? "/sample" : to === "advocate" ? "/advocate-portal" : "/how-it-works");
    }, 250);
  };
  const enter = (i: number) => FadeInDown.duration(500).delay(80 * i);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={mode === "night" ? "light" : "dark"} />
      <SafeAreaView edges={["top"]} style={{ backgroundColor: c.bg }}>
        <View style={s.bar}>
          <Image source={mode === "night" ? require("../../assets/logo-light.png") : require("../../assets/logo-dark.png")} style={{ width: 108, height: 28 }} contentFit="contain" contentPosition="left" accessibilityLabel="Lawmedy" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => { tap(); toggle(); }} accessibilityRole="button" accessibilityLabel={mode === "night" ? "Switch to day mode" : "Switch to night mode"} style={s.iconBtn} hitSlop={6}>
              <Feather name={mode === "night" ? "sun" : "moon"} size={19} color={c.ink} />
            </Pressable>
            {signedIn ? (
              <Pressable onPress={() => { tap(); router.push("/account"); }} accessibilityRole="button" accessibilityLabel={`Your account, ${signedIn.name}`} style={s.avatar} hitSlop={6}>
                <Text style={s.initials}>{initials}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => { tap(); router.push("/login"); }} accessibilityRole="button" style={s.login} hitSlop={6}>
                <Text style={s.loginText}>Log in</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {signedIn?.top ? <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>{signedIn.top}</View> : null}

        <Band photo={photos.advocateDesk} fade="hero">
          <Animated.Text entering={enter(0)} maxFontSizeMultiplier={1.3} accessibilityRole="header" style={s.heroTitle}>The letter that gets things moving.</Animated.Text>
          <Animated.Text entering={enter(1)} style={s.heroLede}>
            Tell us what happened in your own words. We draft a legal notice, an RTI application or a lending certificate from the facts you confirm, an advocate reviews it, and the PDF reaches your WhatsApp.
          </Animated.Text>
          <Animated.View entering={enter(2)} style={s.glass}>
            <Text style={s.glassLabel}>Tell us what happened</Text>
            <TextInput
              value={story}
              onChangeText={setStory}
              multiline
              maxLength={5000}
              accessibilityLabel="Tell us what happened"
              placeholder="For example: I lent ₹1.5 lakh to a friend in March. He promised to return it by June."
              placeholderTextColor={band.muted}
              style={s.storyInput}
            />
            <Pressable onPress={() => { tap(); start("LEGAL_NOTICE", story.trim()); }} accessibilityRole="button" style={({ pressed }) => [s.btn, { backgroundColor: band.accent }, pressed && { opacity: 0.85 }]}>
              <Text style={[s.btnText, { color: band.accentInk }]}>Start my legal notice</Text>
              <Feather name="arrow-right" size={18} color={band.accentInk} />
            </Pressable>
          </Animated.View>
          <Animated.View entering={enter(3)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 14 }}>
              {scenarios.map((sc) => (
                <Pressable key={sc.title} onPress={() => { tap(); setStory(sc.example); }} accessibilityRole="button" style={({ pressed }) => [s.pick, story === sc.example && { borderColor: band.accent, backgroundColor: "rgba(79,191,179,0.18)" }, pressed && { opacity: 0.8 }]}>
                  <Text style={s.pickText}>{sc.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
          <Text style={s.heroPrices}>{price} legal notice · {rtiPrice} RTI · {servicePrice(pricing, "LENDING_CERTIFICATE")} lending certificate</Text>
        </Band>

        <View style={s.section}>
          <Text accessibilityRole="header" style={s.h2}>Three documents, each for a different job</Text>
          <Text style={s.lead}>Each one is written only from facts you confirm, and an advocate approves it before you receive it.</Text>
          <View style={{ gap: 10, marginTop: 16 }}>
            {services.map((service) => (
              <Pressable key={service.type} accessibilityRole="button" accessibilityLabel={`Start ${service.title}`} onPress={() => { tap(); start(service.type); }} style={({ pressed }) => [s.card, s.svc, pressed && { borderColor: c.accent }]}>
                <View style={s.svcIcon}><Feather name={service.icon} size={20} color={c.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.svcTitle}>{service.title}</Text>
                  <Text style={s.svcText} numberOfLines={3}>{service.text}</Text>
                </View>
                <Text style={s.svcPrice}>{servicePrice(pricing, service.type)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={() => { tap(); router.push("/situations"); }} accessibilityRole="button" accessibilityLabel="Which document fits? See situations">
          <Band photo={photos.neighbourhoodDispute} fade="left">
            <Text accessibilityRole="header" style={s.bandTitle}>What’s happening to you?</Text>
            <Text style={s.bandText}>Deposits, salaries, neighbours, builders, government files. See which document fits your situation, and what it costs.</Text>
            <View style={[s.btnGhost, { marginTop: 18 }]}>
              <Text style={s.btnGhostText}>See situations</Text>
              <Feather name="arrow-right" size={18} color={band.ink} />
            </View>
          </Band>
        </Pressable>

        <View style={s.section}>
          <Text accessibilityRole="header" style={s.h2}>From your story to a signed PDF</Text>
          <View style={{ marginTop: 16 }}>
            {steps.map((step, i) => (
              <View key={step.title} style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={s.dot}><Text style={s.dotText}>{i + 1}</Text></View>
                  {i < steps.length - 1 && <View style={s.rail} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable onPress={() => { tap(); router.push("/sample"); }} accessibilityRole="button" style={({ pressed }) => [s.btnQuiet, pressed && { opacity: 0.7 }]}>
            <Text style={s.btnQuietText}>See a sample notice</Text>
          </Pressable>
        </View>

        <Band photo={photos.courtChambers} fade="bottom">
          <Text accessibilityRole="header" style={s.bandTitle}>Why put it in writing?</Text>
          <Text style={s.bandText}>Getting a notice drafted has meant taking leave and visiting an advocate’s chamber, so most people let it go.</Text>
          <View style={s.stats}>
            <Stat figure="5.64 crore" text="cases pending across Indian courts" source="Rajya Sabha reply, 23 July 2026, citing NJDG" />
            <Stat figure="30 days" text="to send a written demand after a cheque bounces" source="Section 138, Negotiable Instruments Act" />
          </View>
        </Band>

        <View style={s.section}>
          <View style={[s.card, { padding: 18, gap: 10 }]}>
            <Feather name="shield" size={22} color={c.accent} />
            <Text style={s.h3}>Reviewed by an advocate</Text>
            <Text style={s.lead}>Every document is checked by one of our in-house advocates before it reaches you. If our advocate cannot take your matter, you get your money back.</Text>
          </View>
          <Pressable onPress={() => { tap(); setChat(true); }} accessibilityRole="button" style={({ pressed }) => [s.card, s.row, pressed && { borderColor: c.accent }]}>
            <Feather name="message-circle" size={20} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Questions? Ask us</Text>
              <Text style={s.rowText}>How it works, prices, privacy, and what AI does</Text>
            </View>
            <Feather name="chevron-right" size={18} color={c.muted} />
          </Pressable>
        </View>

        {testimonials.length > 0 && (
          <View style={[s.section, { paddingTop: 0 }]}>
            <Text style={s.h2}>What customers say</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 14 }}>
              {testimonials.map((t) => (
                <View key={t.id} style={[s.card, { width: 280, padding: 16 }]}>
                  <Text style={s.quote}>{t.quote}</Text>
                  <Text style={s.rowText}>{t.name}{t.descriptor ? `, ${t.descriptor}` : ""}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Band photo={photos.street} fade="center">
          <Text accessibilityRole="header" style={[s.bandTitle, { textAlign: "center" }]}>You have work to do. Put it in writing from your phone.</Text>
          <Text style={[s.bandText, { textAlign: "center" }]}>No leave, no queue, no trip to a chamber.</Text>
          <Pressable onPress={() => { tap(); start("LEGAL_NOTICE"); }} accessibilityRole="button" style={({ pressed }) => [s.btn, { backgroundColor: band.accent, marginTop: 18 }, pressed && { opacity: 0.85 }]}>
            <Text style={[s.btnText, { color: band.accentInk }]}>Start my legal notice</Text>
          </Pressable>
        </Band>

        <View style={s.section}>
          <Pressable onPress={() => { tap(); router.push("/advocate-portal"); }} accessibilityRole="button" style={({ pressed }) => [s.card, s.row, pressed && { borderColor: c.accent }]}>
            <Feather name="briefcase" size={20} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Are you an advocate?</Text>
              <Text style={s.rowText}>Our portal for independent advocates opens soon. Register your interest.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={c.muted} />
          </Pressable>
        </View>
      </ScrollView>
      <AssistantButton onPress={() => setChat(true)} />
      <AssistantSheet visible={chat} onClose={() => setChat(false)} onAction={act} prices={{ notice: price, rti: rtiPrice }} />
    </View>
  );
}

// A full-width photo section under a black fade, the same in day and night.
const fades: Record<"hero" | "left" | "bottom" | "center", { colors: [string, string, ...string[]]; start?: { x: number; y: number }; end?: { x: number; y: number } }> = {
  hero: { colors: ["rgba(8,9,9,0.55)", "rgba(8,9,9,0.82)", "rgba(8,9,9,0.96)"] },
  left: { colors: ["rgba(8,9,9,0.94)", "rgba(8,9,9,0.7)", "rgba(8,9,9,0.45)"], start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  bottom: { colors: ["rgba(8,9,9,0.5)", "rgba(8,9,9,0.85)", "rgba(8,9,9,0.97)"] },
  center: { colors: ["rgba(8,9,9,0.8)", "rgba(8,9,9,0.72)", "rgba(8,9,9,0.9)"] },
};
export function Band({ photo, fade, children }: { photo: ImageSourcePropType; fade: keyof typeof fades; children: React.ReactNode }) {
  const f = fades[fade];
  return (
    <ImageBackground source={photo} resizeMode="cover" style={{ overflow: "hidden", backgroundColor: "#0b0c0c" }}>
      <LinearGradient colors={f.colors} start={f.start} end={f.end} style={StyleSheet.absoluteFill} />
      <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>{children}</View>
    </ImageBackground>
  );
}

function Stat({ figure, text, source }: { figure: string; text: string; source: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: band.ink }}>{figure}</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: band.ink }}>{text}</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 16, color: band.muted }}>Source: {source}</Text>
    </View>
  );
}

const styles = (c: Palette) => StyleSheet.create({
  bar: { height: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: fonts.sansBold, fontSize: 14, color: c.accent },
  login: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  loginText: { fontFamily: fonts.sansBold, fontSize: 15, color: c.accentInk },
  heroTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1.1, color: band.ink, marginTop: 48 },
  heroLede: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, color: band.muted, marginTop: 14, marginBottom: 22 },
  glass: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: band.line, backgroundColor: "rgba(20,22,22,0.62)" },
  glassLabel: { fontFamily: fonts.sansBold, fontSize: 14, color: band.ink, marginBottom: 6 },
  storyInput: { minHeight: 96, textAlignVertical: "top", fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: band.ink, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: band.line, backgroundColor: "rgba(0,0,0,0.35)", marginBottom: 12 },
  btn: { minHeight: 50, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  btnText: { fontFamily: fonts.sansBold, fontSize: 16 },
  btnGhost: { minHeight: 48, alignSelf: "flex-start", borderRadius: 12, borderWidth: 1, borderColor: band.line, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18 },
  btnGhostText: { fontFamily: fonts.sansBold, fontSize: 15, color: band.ink },
  btnQuiet: { minHeight: 48, marginTop: 20, borderRadius: 12, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" },
  btnQuietText: { fontFamily: fonts.sansBold, fontSize: 15, color: c.ink },
  pick: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: band.line, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center" },
  pickText: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: band.ink },
  heroPrices: { fontFamily: fonts.sans, fontSize: 13.5, color: band.muted, marginTop: 16 },
  section: { paddingHorizontal: 20, paddingVertical: 36, gap: 12 },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: c.ink },
  h3: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: c.ink },
  lead: { fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 23, color: c.muted },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line },
  svc: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, minHeight: 76 },
  svcIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" },
  svcTitle: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2, color: c.ink },
  svcText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: c.muted, marginTop: 2 },
  svcPrice: { fontFamily: fonts.sansBold, fontSize: 16, color: c.ink },
  bandTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: band.ink, marginTop: 24 },
  bandText: { fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 23, color: band.muted, marginTop: 10 },
  stats: { flexDirection: "row", gap: 18, marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: band.line, marginBottom: 8 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: c.accent, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  dotText: { fontFamily: fonts.displayBold, fontSize: 13, color: c.accent },
  rail: { flex: 1, width: 2, backgroundColor: c.line, marginVertical: 3 },
  stepTitle: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2, color: c.ink, marginTop: 5 },
  stepText: { fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 21, color: c.muted, marginTop: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, minHeight: 64 },
  rowTitle: { fontFamily: fonts.sansBold, fontSize: 15.5, color: c.ink },
  rowText: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: c.muted, marginTop: 2 },
  quote: { fontFamily: fonts.displayRegular, fontSize: 15, lineHeight: 22, color: c.ink, marginBottom: 10 },
});
