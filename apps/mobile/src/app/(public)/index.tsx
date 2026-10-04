import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { AppScreen, tap } from "@/components/app-ui";
import { AssistantButton, AssistantSheet } from "@/components/assistant";
import { Button } from "@/components/ui";
import { courts } from "@/lib/courts";
import { money } from "@/lib/hooks";
import { WEB_URL } from "@/lib/links";
import { photos } from "@/lib/photos";
import { usePublic, type Pricing, type Testimonial } from "@/lib/public";
import type { AssistantAction } from "@/lib/assistant";
import type { MatterType } from "@/lib/types";
import { colors, fonts, radius, shadow } from "@/lib/theme";

type Icon = keyof typeof MaterialIcons.glyphMap;

// Each category opens the same guided start, set to the right document. The notice types match
// the categories the drafting service handles (money, employment, consumer, property).
const remedies: { icon: Icon; title: string; text: string; tag: string; meta: string; type: MatterType }[] = [
  { icon: "gavel", title: "Send a legal notice", text: "Money owed, a security deposit, a broken agreement, a tenant or property dispute.", tag: "Legal notice", meta: "Advocate-reviewed", type: "LEGAL_NOTICE" },
  { icon: "payments", title: "Unpaid salary or dues", text: "Withheld salary, full and final settlement, unpaid freelance invoices.", tag: "Legal notice", meta: "Employment and money", type: "LEGAL_NOTICE" },
  { icon: "storefront", title: "Notice to a seller or company", text: "Faulty goods, a refund that never came, a service that was not delivered.", tag: "Legal notice", meta: "Consumer dispute", type: "LEGAL_NOTICE" },
  { icon: "account-balance", title: "File an RTI application", text: "Ask a public authority for records, file status, decisions or answer sheets.", tag: "RTI Act, 2005", meta: "Central and state", type: "RTI" },
];

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

export default function Home() {
  const router = useRouter();
  const pricing = usePublic<Pricing | null>("/public/pricing", null);
  const testimonials = usePublic<Testimonial[]>("/public/testimonials", []);
  const price = pricing ? money(pricing.legalNotice, pricing.currency) : "₹299";
  const rtiPrice = pricing ? money(pricing.rti, pricing.currency) : "₹299";
  const [chat, setChat] = useState(false);
  const start = (type?: MatterType) => router.push(type ? { pathname: "/start", params: { type } } : "/start");
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
      left={<Image source={require("../../../assets/logo-dark.png")} style={{ width: 112, height: 30 }} contentFit="contain" contentPosition="left" />}
      right={
        <Pressable onPress={() => { tap(); router.push("/login"); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Log in" style={s.account}>
          <Text style={s.accountText}>Log in</Text>
          <View style={s.avatar}><MaterialIcons name="person" size={18} color="#fff" /></View>
        </Pressable>
      }
    >
      <View style={{ gap: 20, marginTop: 4 }}>
        <View style={[s.card, { padding: 20 }]}>
          <Text style={s.eyebrow}>For working professionals · AI-drafted, advocate-reviewed</Text>
          <Text style={s.headline} accessibilityRole="header">No time to go to court or an advocate during office hours?</Text>
          <Text style={s.lead}>Send a legal notice or file an RTI application without taking leave. Describe the problem in your own words, from your desk or your phone. Our AI drafts it from the facts you give, and an advocate checks it before you get the PDF.</Text>
          <View style={[s.inset, { marginTop: 16 }]}>
            <MaterialIcons name="verified" size={20} color={colors.ink} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.insetTitle}>{price} per document · Checked by an advocate</Text>
              <Text style={s.insetText}>Usually ready within 24 hours of verified payment. No account needed to start.</Text>
            </View>
          </View>
        </View>

        <Feature
          photo={photos.courtChambers}
          chip="The old way"
          chipIcon="schedule"
          title="Take leave, go to the chambers, wait your turn"
          icon="phone-iphone"
          text="That effort is why so many people let a dispute go. With Lawmedy you skip it: explain it on your phone, our AI drafts it, and an advocate reviews it. No visit needed."
          meta={["No leave needed", "Done from your phone"]}
          onPress={() => start()}
        />

        <View style={[s.card, { padding: 20 }]}>
          <View style={s.cardHead}>
            <MaterialIcons name="auto-awesome" size={18} color={colors.ink} />
            <Text style={[s.eyebrow, { marginBottom: 0 }]}>Built on AI, and proud of it</Text>
          </View>
          <Text style={[s.sectionTitle, { marginTop: 10, paddingHorizontal: 0 }]}>Our own AI system, made for legal documents</Text>
          <Text style={s.lead}>We built a system on top of leading AI models so it gets the format and the facts right. It listens, asks, checks, and never guesses.</Text>
          <View style={{ marginTop: 16 }}>
            {aiSteps.map((step, i) => (
              <View key={step.title} style={s.step}>
                <View style={{ alignItems: "center" }}>
                  <View style={[s.stepNum, i === aiSteps.length - 1 && { backgroundColor: colors.ink }]}>
                    {i === aiSteps.length - 1 ? <MaterialIcons name="verified-user" size={14} color="#fff" /> : <Text style={s.stepNumText}>{i + 1}</Text>}
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
          <Button title="Ask how our AI works" variant="outline" icon="chatbubble-ellipses-outline" style={{ marginTop: 16 }} onPress={() => { tap(); setChat(true); }} />
        </View>

        <Feature
          photo={photos.neighbourhoodDispute}
          chip="Legal notice"
          title="From unpaid deposits to boundary disputes"
          icon="handshake"
          text="A legal notice puts your demand on record and gives the other side a deadline to reply. It is usually the first formal step, before anyone goes to court."
          meta={["Your facts, not a template", "PDF you can send"]}
          onPress={() => start("LEGAL_NOTICE")}
        />

        <View style={{ gap: 12 }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>What we can help with</Text>
            <Text style={s.sectionMeta}>4 kinds</Text>
          </View>
          {remedies.map((r) => (
            <Pressable key={r.title} onPress={() => { tap(); start(r.type); }} accessibilityRole="button" accessibilityLabel={r.title} style={({ pressed }) => [s.card, s.remedy, pressed && { backgroundColor: colors.tint }]}>
              <View style={s.tile}><MaterialIcons name={r.icon} size={22} color={colors.ink} /></View>
              <View style={{ flex: 1 }}>
                <View style={s.remedyHead}>
                  <Text style={s.remedyTitle}>{r.title}</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.muted} />
                </View>
                <Text style={s.remedyText} numberOfLines={2}>{r.text}</Text>
                <View style={s.tags}>
                  <Text style={s.tag}>{r.tag}</Text>
                  <Text style={s.tagMeta}>{r.meta}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Feature
          photo={courts.supremeCourtWide}
          chip="Right to Information"
          title="Records from any public authority"
          icon="schedule"
          text="Under the RTI Act, 2005, a public information officer must reply within 30 days. We draft the application to the right office; you pay the government fee directly."
          meta={["Central and state offices", "Ready to submit"]}
          onPress={() => start("RTI")}
        />

        <View style={[s.card, { padding: 16, gap: 12 }]}>
          <View style={s.cardHead}>
            <MaterialIcons name="lightbulb-outline" size={20} color={colors.ink} />
            <Text style={s.cardTitle}>Before you start</Text>
          </View>
          <View style={{ gap: 8 }}>
            <Shortcut icon="fact-check" title="Check your case for free" text="See what we understood and what we would need" onPress={() => start()} />
            <Shortcut icon="description" title="See a sample notice" text="What the final, advocate-checked PDF looks like" onPress={() => router.push("/sample")} />
            <Shortcut icon="sync-alt" title="How it works" text="From your words to a reviewed PDF, step by step" onPress={() => router.push("/how-it-works")} />
          </View>
        </View>

        {testimonials.length > 0 && (
          <View style={{ gap: 12 }}>
            <View style={s.sectionHead}><Text style={s.sectionTitle}>What customers say</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
              {testimonials.map((t) => (
                <View key={t.id} style={[s.card, s.quote]}>
                  <MaterialIcons name="format-quote" size={22} color={colors.faint} />
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
              <MaterialIcons name="verified-user" size={20} color={colors.ink} />
              <Text style={s.cardTitle}>Reviewed by an advocate</Text>
            </View>
            <Text style={s.lead}>Every legal notice and RTI application is checked by one of our in-house advocates before it reaches you. Our AI does the heavy lifting; a person decides what goes out.</Text>
            <View style={{ gap: 8 }}>
              <Point icon="edit-note" title="Edited, not just approved" text="The advocate may correct the draft or ask you a question first." />
              <Point icon="currency-rupee" title="Full refund if we decline" text="If our advocate cannot take your matter, you get your money back." />
            </View>
          </View>
        </View>

        <View style={[s.card, { padding: 20, gap: 12 }]}>
          <View style={s.soon}><View style={s.soonDot} /><Text style={s.soonText}>Coming soon · For advocates</Text></View>
          <Text style={s.sectionTitle}>More clients, less paperwork</Text>
          <Text style={[s.lead, { marginTop: 0 }]}>Today our in-house advocates review every document. Our portal for independent advocates is almost ready: requests reach you on a digital desk with the facts organised and the documents attached. You review the draft, the person gets help quickly, and you build a client list without extra legwork.</Text>
          <View style={{ gap: 8 }}>
            <Point icon="assignment" title="Requests arrive ready to review" text="The client's account, key facts and documents, with a first draft for you to correct." />
            <Point icon="trending-up" title="Clients who may need you again" text="When a notice gets no reply or a matter has to go further, the person already knows the advocate who handled it." />
          </View>
          <Button title="Register as an advocate" variant="outline" icon="arrow-forward" iconAfter onPress={() => { tap(); router.push("/advocate-portal"); }} />
        </View>
        <View style={{ height: 56 }} />
      </View>
    </AppScreen>
    <AssistantButton onPress={() => setChat(true)} />
    <AssistantSheet visible={chat} onClose={() => setChat(false)} onAction={act} prices={{ notice: price, rti: rtiPrice }} />
    </View>
  );
}

function Feature({ photo, chip, chipIcon = "verified", title, icon, text, meta, onPress }: { photo: ImageSource; chip: string; chipIcon?: Icon; title: string; icon: Icon; text: string; meta: string[]; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.card, { overflow: "hidden" }, pressed && { opacity: 0.94 }]}>
      <View style={s.featurePhoto}>
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <LinearGradient colors={["transparent", "rgba(28,27,26,0.25)", "rgba(28,27,26,0.85)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={s.featureCaption}>
          <View style={s.chip}><MaterialIcons name={chipIcon} size={13} color="#fff" /><Text style={s.chipText}>{chip}</Text></View>
          <Text style={s.featureTitle}>{title}</Text>
        </View>
      </View>
      <View style={s.featureBody}>
        <View style={s.round}><MaterialIcons name={icon} size={18} color={colors.ink} /></View>
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
      <MaterialIcons name={icon} size={20} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <Text style={s.insetTitle}>{title}</Text>
        <Text style={s.insetText}>{text}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

function Point({ icon, title, text }: { icon: Icon; title: string; text: string }) {
  return (
    <View style={s.inset}>
      <MaterialIcons name={icon} size={18} color={colors.ink} style={{ marginTop: 1 }} />
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
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, ...shadow },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.9, textTransform: "uppercase", color: colors.muted, marginBottom: 12 },
  headline: { fontFamily: fonts.display, fontSize: 30, lineHeight: 37, letterSpacing: -0.7, color: colors.ink },
  lead: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 10 },
  inset: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: radius.sm, backgroundColor: colors.tint },
  insetTitle: { fontFamily: fonts.sansBold, fontSize: 13, lineHeight: 18, color: colors.ink },
  insetText: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 1 },
  featurePhoto: { height: 192, justifyContent: "flex-end", backgroundColor: colors.tint2 },
  featureCaption: { padding: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", marginBottom: 6 },
  chipText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", color: "#fff" },
  featureTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: "#fff" },
  featureBody: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  round: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tint2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  featureText: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 21, color: colors.ink },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metaText: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, color: colors.muted },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: colors.ink },
  sectionMeta: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted },
  remedy: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  tile: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.tint2, alignItems: "center", justifyContent: "center" },
  remedyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  remedyTitle: { flex: 1, fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1, color: colors.ink },
  remedyText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
  tags: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  tag: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ink, backgroundColor: colors.tint2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  tagMeta: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.muted },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  quote: { width: 280, padding: 16 },
  quoteText: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, color: colors.ink, marginVertical: 8 },
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
