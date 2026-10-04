import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { AppScreen, BarButton, success, tap } from "@/components/app-ui";
import { Button, Field, Message } from "@/components/ui";
import { publicApi } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts, radius, shadow } from "@/lib/theme";

type Icon = keyof typeof MaterialIcons.glyphMap;

const perks: { icon: Icon; title: string; text: string }[] = [
  { icon: "assignment", title: "Requests ready to review", text: "Each matter arrives with the person's account, the confirmed facts, their documents and an AI first draft." },
  { icon: "edit-note", title: "Review on your phone or desk", text: "Correct the draft, ask the client a question, and approve it, all in one place." },
  { icon: "trending-up", title: "Take matters further", text: "When a notice gets no reply or a case has to go to court, the client already knows and trusts you." },
];

// Advocates register interest in the upcoming advocate portal. The team reaches out later,
// by phone first. Nothing here creates an account or grants access.
export default function AdvocatePortal() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [place, setPlace] = useState("");
  const [nudged, setNudged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pop] = useState(() => new Animated.Value(0));
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => { if (done) Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start(); }, [done, pop]);

  async function submit() {
    setError("");
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (place.trim().length < 2) return setError("Please tell us where you practise.");
    // Phone is optional, but it is how we reach people fastest, so ask once before going on without it.
    if (!phone.trim() && !nudged) { setNudged(true); phoneRef.current?.focus(); return; }
    setBusy(true);
    try {
      await publicApi("/public/advocate-interest", { method: "POST", body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined, practicePlace: place.trim(), source: "app" }) });
      success();
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AppScreen left={<BarButton icon="chevron-back" label="Back" onPress={() => router.back()} />}>
        <View style={s.doneWrap}>
          <Animated.View style={[s.doneIcon, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
            <MaterialIcons name="check" size={40} color="#fff" />
          </Animated.View>
          <Text style={s.doneTitle}>You are on the list, {fullName.trim().split(" ")[0]}.</Text>
          <Text style={s.doneText}>
            Thank you for your interest. When the advocate portal opens, our team will reach out {phone.trim() ? `on ${phone.trim()} or at ${email.trim()}` : `at ${email.trim()}`}.
          </Text>
          <Button title="Back to home" onPress={() => { tap(); router.back(); }} style={{ alignSelf: "stretch", marginTop: 24 }} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      left={<BarButton icon="chevron-back" label="Back" onPress={() => router.back()} />}
      footer={
        <>
          <Button title={nudged && !phone.trim() ? "Continue without phone" : "Register my interest"} loading={busy} onPress={() => { tap(); void submit(); }} />
          <Text style={s.consent}>We will only use these details to contact you about the advocate portal.</Text>
        </>
      }
    >
      <View style={s.badge}><View style={s.badgeDot} /><Text style={s.badgeText}>Coming soon · Advocate portal</Text></View>
      <Text style={s.title} accessibilityRole="header">Join Lawmedy as an advocate</Text>
      <Text style={s.lead}>Today, every Lawmedy document is reviewed by our in-house advocates. Our portal for independent advocates is almost ready: review legal notices and RTI applications, help people quickly, and take their matters further.</Text>

      <View style={[s.card, { marginTop: 18 }]}>
        {perks.map((p, i) => (
          <View key={p.title} style={[s.perk, i < perks.length - 1 && s.perkLine]}>
            <View style={s.tile}><MaterialIcons name={p.icon} size={20} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.perkTitle}>{p.title}</Text>
              <Text style={s.perkText}>{p.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={s.section}>Register your interest</Text>
      <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Adv. Your Name" autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />

      <View style={{ marginBottom: 16 }}>
        <View style={s.labelRow}>
          <Text style={s.label}>Phone number</Text>
          <Text style={s.recommended}>Recommended</Text>
        </View>
        <View style={[s.phoneBox, nudged && !phone.trim() && { borderColor: colors.ink, borderWidth: 1.5 }]}>
          <Text style={s.prefix}>+91</Text>
          <TextInput ref={phoneRef} value={phone} onChangeText={setPhone} placeholder="98765 43210" placeholderTextColor={colors.faint} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={16} style={s.phoneInput} />
        </View>
        <Text style={[s.note, nudged && !phone.trim() && { color: colors.ink, fontFamily: fonts.sansBold }]}>
          {nudged && !phone.trim() ? "A phone number is the quickest way for us to reach you. Add it, or continue without it." : "Optional, but it is the fastest way for us to reach you, by call or WhatsApp."}
        </Text>
      </View>

      <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Where do you practise?" value={place} onChangeText={setPlace} placeholder="For example, Saket District Court, New Delhi" note="Your court or city" autoCapitalize="words" />
      <Message error={error} />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.tint2, marginTop: 4 },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ok },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 37, letterSpacing: -0.6, color: colors.ink, marginTop: 14 },
  lead: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.muted, marginTop: 10 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingHorizontal: 16, ...shadow },
  perk: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  perkLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  tile: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.tint2, alignItems: "center", justifyContent: "center" },
  perkTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  perkText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 2 },
  section: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: colors.ink, marginTop: 28, marginBottom: 14 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  label: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink },
  recommended: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ok, backgroundColor: colors.okBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  phoneBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: "#c7c7c0", borderRadius: radius.sm },
  prefix: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.muted, paddingLeft: 14, paddingRight: 8 },
  phoneInput: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, paddingVertical: 13, paddingRight: 14 },
  note: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 5 },
  consent: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, textAlign: "center" },
  doneWrap: { alignItems: "center", paddingTop: 48 },
  doneIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.ok, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  doneTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4, color: colors.ink, textAlign: "center" },
  doneText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.muted, textAlign: "center", marginTop: 10 },
});
