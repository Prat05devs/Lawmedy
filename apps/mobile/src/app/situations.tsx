import React, { useState } from "react";
import { LayoutAnimation, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { tap } from "@/components/app-ui";
import { Band } from "@/components/home-screen";
import { useAuth } from "@/lib/auth";
import { post } from "@/lib/api";
import { saveDraft } from "@/lib/guest-draft";
import { errorMessage } from "@/lib/hooks";
import { WHATSAPP_DISPLAY, WHATSAPP_LINK } from "@/lib/links";
import { photos } from "@/lib/photos";
import { usePublic, type Pricing } from "@/lib/public";
import { servicePrice, services } from "@/lib/services";
import { setStatementDraft } from "@/lib/statement-draft";
import { band, useAppTheme, type Palette } from "@/lib/app-theme";
import { fonts } from "@/lib/theme";
import { ctaFor, lifeAreas, type UseCase } from "@/lib/use-cases";
import type { Matter } from "@/lib/types";

// Identifies the guest draft handed to the quick check.
const newDraftKey = () => String(Date.now());

// "Which document fits?": pick a part of life, then a situation, to see the document that fits it.
export default function Situations() {
  const router = useRouter();
  const { user } = useAuth();
  const { mode, c, toggle } = useAppTheme();
  const s = styles(c);
  const pricing = usePublic<Pricing | null>("/public/pricing", null);
  const [area, setArea] = useState(0);
  const [open, setOpen] = useState(0);
  const [error, setError] = useState("");
  const busy = React.useRef(false);
  const current = lifeAreas[area];

  // Signed in: create the matter straight away. Guest: the same quick check the home page uses.
  async function start(u: UseCase) {
    if (!user) {
      if (u.example) saveDraft({ type: u.type, statement: u.example });
      return router.push({ pathname: "/start", params: { type: u.type, ...(u.example ? { draftKey: newDraftKey() } : {}) } });
    }
    if (busy.current) return;
    busy.current = true; setError("");
    try {
      const matter = await post<Matter>("/matters", { type: u.type });
      if (u.example) setStatementDraft(matter.id, u.example);
      router.push({ pathname: "/matter/[id]", params: { id: matter.id } });
    } catch (e) { setError(errorMessage(e)); }
    finally { busy.current = false; }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Band photo={photos.neighbourhoodDispute} fade="bottom">
          <SafeAreaView edges={["top"]}>
            <View style={s.top}>
              <Pressable onPress={() => { tap(); router.back(); }} accessibilityRole="button" accessibilityLabel="Back" style={s.bandBtn} hitSlop={6}>
                <Feather name="chevron-left" size={22} color={band.ink} />
              </Pressable>
              <Pressable onPress={() => { tap(); toggle(); }} accessibilityRole="button" accessibilityLabel={mode === "night" ? "Switch to day mode" : "Switch to night mode"} style={s.bandBtn} hitSlop={6}>
                <Feather name={mode === "night" ? "sun" : "moon"} size={19} color={band.ink} />
              </Pressable>
            </View>
          </SafeAreaView>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>Which document fits?</Text>
          <Text style={s.sub}>Tap the part of life it touches, then your situation.</Text>
        </Band>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 16 }} accessibilityRole="tablist">
          {lifeAreas.map((a, i) => {
            const on = i === area;
            return (
              <Pressable key={a.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { tap(); setArea(i); setOpen(0); }} style={[s.chip, on && { backgroundColor: c.ink, borderColor: c.ink }]}>
                <Text style={[s.chipText, on && { color: c.bg }]}>{a.short}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Text style={s.intro}>{current.intro}</Text>
          {error ? <Text style={s.error}>{error}</Text> : null}
          {current.cases.map((u, i) => {
            const expanded = i === open;
            const service = services.find((x) => x.type === u.type)!;
            return (
              <Animated.View key={`${current.id}-${u.title}`} entering={FadeInDown.duration(400).delay(50 * i)} style={s.card}>
                <Pressable
                  onPress={() => { tap(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(expanded ? -1 : i); }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={s.caseHead}
                >
                  <Text style={s.caseTitle}>{u.title}</Text>
                  <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={c.muted} />
                </Pressable>
                {expanded && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <Text style={s.caseText}>{u.text}</Text>
                    <View style={s.fits}>
                      <Text style={s.fitsName}>{service.title}</Text>
                      <Text style={s.fitsPrice}>{servicePrice(pricing, u.type)}</Text>
                    </View>
                    <Pressable onPress={() => { tap(); void start(u); }} accessibilityRole="button" style={({ pressed }) => [s.go, pressed && { opacity: 0.85 }]}>
                      <Text style={s.goText}>{ctaFor[u.type]}</Text>
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            );
          })}
          <Pressable onPress={() => { tap(); void Linking.openURL(WHATSAPP_LINK); }} accessibilityRole="link" style={({ pressed }) => [s.help, pressed && { opacity: 0.8 }]}>
            <Feather name="message-circle" size={18} color={c.accent} />
            <Text style={s.helpText}>Not sure which one you need? WhatsApp us at {WHATSAPP_DISPLAY} and we’ll tell you.</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (c: Palette) => StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", marginTop: -28 },
  bandBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: band.line, backgroundColor: band.glass, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 35, letterSpacing: -0.9, color: band.ink, marginTop: 56 },
  sub: { fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 22, color: band.muted, marginTop: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.line, justifyContent: "center" },
  chipText: { fontFamily: fonts.sansBold, fontSize: 14.5, color: c.muted },
  intro: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: c.muted, marginBottom: 4 },
  error: { fontFamily: fonts.sans, fontSize: 14, color: "#ba1a1a" },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, overflow: "hidden" },
  caseHead: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 16, paddingVertical: 14 },
  caseTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 15.5, lineHeight: 21, letterSpacing: -0.2, color: c.ink },
  caseText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: c.muted },
  fits: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
  fitsName: { fontFamily: fonts.sansBold, fontSize: 14.5, color: c.ink },
  fitsPrice: { fontFamily: fonts.sans, fontSize: 14.5, color: c.muted },
  go: { minHeight: 48, marginTop: 14, borderRadius: 12, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  goText: { fontFamily: fonts.sansBold, fontSize: 15.5, color: c.accentInk },
  help: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 14, backgroundColor: c.tint, marginTop: 8 },
  helpText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: c.ink },
});
