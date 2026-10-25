import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { AppScreen, tap } from "@/components/app-ui";
import { AssistantButton, AssistantSheet } from "@/components/assistant";
import { Button } from "@/components/ui";
import { saveDraft } from "@/lib/guest-draft";
import { courts } from "@/lib/courts";
import { services, servicePrice } from "@/lib/services";
import { WEB_URL } from "@/lib/links";
import { photos } from "@/lib/photos";
import { usePublic, type Pricing, type Testimonial } from "@/lib/public";
import type { AssistantAction } from "@/lib/assistant";
import type { MatterType } from "@/lib/types";
import { categories, scenarios, type Tone } from "@/lib/scenarios";
import { colors, fonts, radius, shadow } from "@/lib/theme";

type Icon = keyof typeof Feather.glyphMap;

const toneDot: Record<Tone, string> = { genda: "bg-genda", mor: "bg-mor", rani: "bg-rani" };

// What our AI system does, in order. Each step matches the API: intake analysis, follow-up
// questions, evidence extraction, structured drafting with vetted legal bases, QA, advocate review.
const aiSteps: { title: string; text: string }[] = [
  { title: "Understands you", text: "Reads your account in Hindi, English or a mix, and records each fact in your own exact words." },
  { title: "Cross-questions you", text: "Asks a few short questions about dates, amounts or agreements, instead of guessing." },
  { title: "Reads your proof", text: "Takes only what is visible in receipts, chats, transfers and agreements." },
  { title: "Drafts to a legal format", text: "A fixed legal structure, citing laws only from our vetted list. It never invents one." },
  { title: "Checks its own work", text: "A second AI pass compares every line with the facts you confirmed." },
  { title: "An advocate signs off", text: "A real advocate reads it, corrects it and approves it before you get it." },
];

// Signed-in extras for the shared home page: who is signed in, how "start" works for them, and
// a section shown above everything else (their matters).
export type SignedIn = { name: string; onStart: (type?: MatterType, story?: string) => void; top?: React.ReactNode };

// The main page. Everyone sees the same home, signed in or not; signed-in people also see their
// matters at the top, and starting a document creates a matter instead of the guest quick check.
export function HomeScreen({ signedIn }: { signedIn?: SignedIn }) {
  const router = useRouter();
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

  return (
    <View style={{ flex: 1 }}>
    <AppScreen
      left={<Image source={require("../../assets/logo-dark.png")} style={{ width: 112, height: 30 }} contentFit="contain" contentPosition="left" accessibilityLabel="Lawmedy" />}
      right={signedIn ? (
        <Pressable onPress={() => { tap(); router.push("/account"); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Your account, ${signedIn.name}`} style={s.account}>
          <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>
        </Pressable>
      ) : (
        <Pressable onPress={() => { tap(); router.push("/login"); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Log in" style={s.account}>
          <Text style={s.accountText}>Log in</Text>
          <View style={s.avatar}><Feather name="user" size={18} color="#fff" /></View>
        </Pressable>
      )}
    >
      <View style={{ gap: 20, marginTop: 4 }}>
        {signedIn?.top}
        <View className="rounded-2xl bg-robe p-5">
          <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" className="font-display text-[28px] leading-[32px] tracking-tight text-white">
            Legal notices, RTI applications and lending certificates, <Text className="font-display text-genda">on your side.</Text>
          </Text>
          <Text className="mt-3 font-sans text-[15px] leading-[23px] text-white/75">
            Tell us what happened in your own words. You confirm the facts, an advocate reviews your document, and the PDF reaches you on WhatsApp.
          </Text>
          <View style={{ marginTop: 16, padding: 14, backgroundColor: colors.card, borderRadius: radius.sm }}>
            <Text style={s.insetTitle}>Tell us what happened</Text>
            <TextInput value={story} onChangeText={setStory} multiline maxLength={5000} accessibilityLabel="Tell us what happened" placeholder="Who was involved? What happened, and what would you like to happen?" placeholderTextColor={colors.muted} style={{ minHeight: 100, textAlignVertical: "top", fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, color: colors.ink, paddingVertical: 10 }} />
            <Button variant="gold" title="Start my legal notice" icon="arrow-right" iconAfter onPress={() => start("LEGAL_NOTICE", story.trim())} />
          </View>
          <Text className="mt-3 font-sans-bold text-sm text-white">{price} per notice · usually ready within 24 hours of verified payment</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={s.sectionTitle}>Three services, clear prices</Text>
          {services.map((service) => (
            <Pressable key={service.type} accessibilityRole="button" accessibilityLabel={`Start ${service.title}`} onPress={() => { tap(); start(service.type); }} style={({ pressed }) => [s.card, s.remedy, pressed && { opacity: 0.75 }]}>
              <View style={s.tile}><Feather name={service.icon} size={22} color={colors.ink} accessible={false} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.remedyTitle}>{service.title}</Text>
                <Text style={[s.sectionTitle, { marginTop: 6 }]}>{servicePrice(pricing, service.type)}</Text>
                <Text style={s.remedyText}>{service.text}</Text>
                <Text style={[s.insetTitle, { marginTop: 12 }]}>Get started →</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={s.sectionTitle}>Situations we help with</Text>
          <Text style={s.lead}>Choose the one closest to yours. We’ll start your story with blanks for you to fill in.</Text>
          {categories.map((category) => (
            <View key={category.title} style={[s.card, { padding: 16 }]}>
              <Text accessibilityRole="header" style={s.remedyTitle}>{category.title}</Text>
              <Text style={s.remedyText}>{category.text}</Text>
              {category.items.map((title) => {
                const scenario = scenarios.find((item) => item.title === title)!;
                return <Pressable key={title} accessibilityRole="button" accessibilityLabel={title} onPress={() => { tap(); start("LEGAL_NOTICE", scenario.example); }} style={({ pressed }) => [{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, pressed && { opacity: 0.6 }]}>
                  <View className={`h-2.5 w-2.5 rounded-full ${toneDot[scenario.tone]}`} accessible={false} />
                  <Text style={[s.remedyText, { flex: 1, marginTop: 0 }]}>{title}</Text>
                  <Feather name="chevron-right" size={18} color={colors.muted} accessible={false} />
                </Pressable>;
              })}
            </View>
          ))}
          <Shortcut icon="book-open" title="Government records (RTI)" text="Application status, public decisions, file notings and answer sheets." onPress={() => start("RTI")} />
          <Shortcut icon="file-plus" title="Record money already lent" text="Loans to friends or family and payments already made, with the transfer and repayment terms you provide." onPress={() => start("LENDING_CERTIFICATE")} />
        </View>

        <Feature
          photo={photos.courtChambers}
          chip="The old way"
          chipIcon="clock"
          title="Take leave, go to the chambers, wait your turn"
          icon="smartphone"
          text="That effort is why so many people let a dispute go. With Lawmedy you skip it: explain it on your phone, our AI drafts it, and an advocate reviews it. No visit needed."
          meta={["No leave needed", "Done from your phone"]}
          onPress={() => start()}
        />

        <View style={[s.card, { padding: 20 }]}>
          <View style={s.cardHead}>
            <Feather name="cpu" size={18} color={colors.ink} />
            <Text style={[s.eyebrow, { marginBottom: 0 }]}>Built on AI, and proud of it</Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[s.sectionTitle, { marginTop: 10, paddingHorizontal: 0 }]}>Our own AI system, made for legal documents</Text>
          <Text style={s.lead}>We built a system on top of leading AI models so it gets the format and the facts right. It listens, asks, checks, and never guesses.</Text>
          <View style={{ marginTop: 16 }}>
            {aiSteps.map((step, i) => (
              <View key={step.title} style={s.step}>
                <View style={{ alignItems: "center" }}>
                  <View style={[s.stepNum, i === aiSteps.length - 1 && { backgroundColor: colors.ink }]}>
                    {i === aiSteps.length - 1 ? <Feather name="shield" size={14} color="#fff" /> : <Text style={s.stepNumText}>{i + 1}</Text>}
                  </View>
                  {i < aiSteps.length - 1 && <View style={s.stepLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < aiSteps.length - 1 ? 14 : 0 }}>
                  <Text style={s.insetTitle}>{step.title}</Text>
                  <Text style={s.insetText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <Button title="Ask how our AI works" variant="outline" icon="message-circle" style={{ marginTop: 16 }} onPress={() => { tap(); setChat(true); }} />
        </View>

        <Feature
          photo={photos.neighbourhoodDispute}
          chip="Legal notice"
          title="From unpaid deposits to boundary disputes"
          icon="users"
          text="A legal notice puts your demand on record and gives the other side a deadline to reply. It is usually the first formal step, before anyone goes to court."
          meta={["Your facts, not a template", "PDF you can send"]}
          onPress={() => start("LEGAL_NOTICE")}
        />

        <Feature
          photo={courts.supremeCourtWide}
          chip="Right to Information"
          title="Records from any public authority"
          icon="clock"
          text="Under the RTI Act, 2005, a public information officer must reply within 30 days. We draft the application to the right office; you pay the government fee directly."
          meta={["Central and state offices", "Ready to submit"]}
          onPress={() => start("RTI")}
        />

        <View style={[s.card, { padding: 16, gap: 12 }]}>
          <View style={s.cardHead}>
            <Feather name="info" size={20} color={colors.ink} />
            <Text style={s.cardTitle}>Before you start</Text>
          </View>
          <View style={{ gap: 8 }}>
            <Shortcut icon="check-square" title="Check your case for free" text="See what we understood and what we would need" onPress={() => start()} />
            <Shortcut icon="file-text" title="See a sample notice" text="What the final, advocate-checked PDF looks like" onPress={() => router.push("/sample")} />
            <Shortcut icon="repeat" title="How it works" text="From your words to a reviewed PDF, step by step" onPress={() => router.push("/how-it-works")} />
          </View>
        </View>

        {testimonials.length > 0 && (
          <View style={{ gap: 12 }}>
            <View style={s.sectionHead}><Text maxFontSizeMultiplier={1.3} style={s.sectionTitle}>What customers say</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
              {testimonials.map((t) => (
                <View key={t.id} style={[s.card, s.quote]}>
                  <Feather name="message-square" size={22} color={colors.faint} />
                  <Text style={s.quoteText}>{t.quote}</Text>
                  <Text style={s.quoteBy}>{t.name}{t.descriptor ? ` · ${t.descriptor}` : ""}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[s.card, { overflow: "hidden" }]}>
          <Image source={courts.uttarakhandHighCourt} style={s.bannerPhoto} contentFit="cover" transition={150} />
          <View style={{ padding: 16, gap: 12 }}>
            <View style={s.cardHead}>
              <Feather name="shield" size={20} color={colors.ink} />
              <Text style={s.cardTitle}>Reviewed by an advocate</Text>
            </View>
            <Text style={s.lead}>Every legal notice, RTI application and lending certificate is checked by one of our in-house advocates before it reaches you. Our AI does the heavy lifting; a person decides what goes out.</Text>
            <View style={{ gap: 8 }}>
              <Point icon="edit-3" title="Edited, not just approved" text="The advocate may correct the draft or ask you a question first." />
              <Point icon="rotate-ccw" title="Full refund if we decline" text="If our advocate cannot take your matter, you get your money back." />
            </View>
          </View>
        </View>

        <View style={[s.card, { padding: 20, gap: 12 }]}>
          <View style={s.soon}><View style={s.soonDot} /><Text style={s.soonText}>Coming soon · For advocates</Text></View>
          <Text maxFontSizeMultiplier={1.3} style={s.sectionTitle}>More clients, less paperwork</Text>
          <Text style={[s.lead, { marginTop: 0 }]}>Today our in-house advocates review every document. Our portal for independent advocates is almost ready: requests reach you on a digital desk with the facts organised and the documents attached. You review the draft, the person gets help quickly, and you build a client list without extra legwork.</Text>
          <View style={{ gap: 8 }}>
            <Point icon="clipboard" title="Requests arrive ready to review" text="The client's account, key facts and documents, with a first draft for you to correct." />
            <Point icon="trending-up" title="Clients who may need you again" text="When a notice gets no reply or a matter has to go further, the person already knows the advocate who handled it." />
          </View>
          <Button title="Register as an advocate" variant="outline" icon="arrow-right" iconAfter onPress={() => { tap(); router.push("/advocate-portal"); }} />
        </View>
        <View style={{ height: 56 }} />
      </View>
    </AppScreen>
    <AssistantButton onPress={() => setChat(true)} />
    <AssistantSheet visible={chat} onClose={() => setChat(false)} onAction={act} prices={{ notice: price, rti: rtiPrice }} />
    </View>
  );
}

function Feature({ photo, chip, chipIcon = "check-circle", title, icon, text, meta, onPress }: { photo: ImageSource; chip: string; chipIcon?: Icon; title: string; icon: Icon; text: string; meta: string[]; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.card, { overflow: "hidden" }, pressed && { opacity: 0.94 }]}>
      <View style={s.featurePhoto}>
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <LinearGradient colors={["transparent", "rgba(28,27,26,0.25)", "rgba(28,27,26,0.85)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={s.featureCaption}>
          <View style={s.chip}><Feather name={chipIcon} size={13} color="#fff" /><Text style={s.chipText}>{chip}</Text></View>
          <Text maxFontSizeMultiplier={1.3} style={s.featureTitle}>{title}</Text>
        </View>
      </View>
      <View style={s.featureBody}>
        <View style={s.round}><Feather name={icon} size={18} color={colors.ink} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.featureText}>{text}</Text>
          <View style={s.metaRow}>
            {meta.map((m, i) => <Text key={m} style={s.metaText}>{i > 0 ? "•  " : ""}{m}</Text>)}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Shortcut({ icon, title, text, onPress }: { icon: Icon; title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.inset, { alignItems: "center" }, pressed && { backgroundColor: colors.tint2 }]}>
      <Feather name={icon} size={20} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <Text style={s.insetTitle}>{title}</Text>
        <Text style={s.insetText}>{text}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

function Point({ icon, title, text }: { icon: Icon; title: string; text: string }) {
  return (
    <View style={s.inset}>
      <Feather name={icon} size={18} color={colors.ink} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.insetTitle}>{title}</Text>
        <Text style={s.insetText}>{text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  account: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  accountText: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted },
  initials: { fontFamily: fonts.sansBold, fontSize: 13, color: "#fff" },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, ...shadow },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.9, textTransform: "uppercase", color: colors.muted, marginBottom: 12 },
  headline: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, color: colors.ink },
  lead: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 10 },
  inset: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: radius.sm, backgroundColor: colors.tint },
  insetTitle: { fontFamily: fonts.sansBold, fontSize: 13, lineHeight: 18, color: colors.ink },
  insetText: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 1 },
  featurePhoto: { height: 192, justifyContent: "flex-end", backgroundColor: colors.tint2 },
  featureCaption: { padding: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", marginBottom: 6 },
  chipText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", color: "#fff" },
  featureTitle: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.3, color: "#fff" },
  featureBody: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  round: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tint2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  featureText: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 21, color: colors.ink },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metaText: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, color: colors.muted },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: colors.ink },
  sectionMeta: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted },
  remedy: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  tile: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.tint2, alignItems: "center", justifyContent: "center" },
  remedyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  remedyTitle: { flex: 1, fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1, color: colors.ink },
  remedyText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
  tags: { flexWrap: "wrap", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  tag: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ink, backgroundColor: colors.tint2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  tagMeta: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.muted },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  quote: { width: 280, padding: 16 },
  quoteText: { fontFamily: fonts.displayRegular, fontSize: 15, lineHeight: 22, color: colors.ink, marginVertical: 8 },
  quoteBy: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  soon: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.tint2 },
  soonDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ok },
  soonText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", color: colors.ink },
  step: { flexDirection: "row", gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.tint2, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.ink },
  stepLine: { flex: 1, width: 1.5, backgroundColor: colors.line, marginVertical: 3 },
  bannerPhoto: { width: "100%", height: 160, backgroundColor: colors.tint2 },
});
