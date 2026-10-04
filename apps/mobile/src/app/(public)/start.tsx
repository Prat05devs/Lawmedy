import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen, BarButton, PhotoCard, Progress, success, tap } from "@/components/app-ui";
import { Body, Button, Message } from "@/components/ui";
import { publicApi } from "@/lib/api";
import { courts } from "@/lib/courts";
import { clearDraft, loadDraft, saveDraft } from "@/lib/guest-draft";
import { errorMessage, money } from "@/lib/hooks";
import { usePublic, type PublicAuthority, type Pricing, type QuickCheck } from "@/lib/public";
import { colors, fonts, radius } from "@/lib/theme";
import type { MatterType } from "@/lib/types";

type Step = "type" | "describe" | "authority" | "result";

const prompts: Record<MatterType, string> = {
  LEGAL_NOTICE: "Who was involved? What happened, and when? Any amounts or promises? What do you want to happen?",
  RTI: "Which office? What records or decisions do you want? For what period?",
};

export default function Start() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const pricing = usePublic<Pricing | null>("/public/pricing", null);
  const authorities = usePublic<PublicAuthority[]>("/public/rti-authorities", []);
  const preset: MatterType | null = params.type === "RTI" ? "RTI" : params.type === "LEGAL_NOTICE" ? "LEGAL_NOTICE" : null;
  const [type, setType] = useState<MatterType | null>(preset);
  const [step, setStep] = useState<Step>(preset ? "describe" : "type");
  const [statement, setStatement] = useState("");
  const [authorityId, setAuthorityId] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<QuickCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    void loadDraft().then((d) => {
      if (d && !loaded.current) {
        if (!preset) { setType(d.type); setStep("describe"); }
        if (!preset || preset === d.type) { setStatement(d.statement); setAuthorityId(d.authorityId ?? ""); setSubject(d.subject ?? ""); }
      }
      loaded.current = true;
    });
  }, [preset]);
  useEffect(() => { if (preset) { setType(preset); setStep("describe"); setResult(null); } }, [preset]);
  useEffect(() => {
    if (!loaded.current || !type || !statement.trim()) return;
    const t = setTimeout(() => saveDraft({ type, statement, authorityId: authorityId || undefined, subject: subject || undefined }), 500);
    return () => clearTimeout(t);
  }, [type, statement, authorityId, subject]);

  const order: Step[] = type === "RTI" ? ["type", "describe", "authority", "result"] : ["type", "describe", "result"];
  const index = Math.max(order.indexOf(step), 0);
  const back = () => { setError(""); if (index === 0) return router.back(); setStep(order[index - 1]); };
  const price = pricing && type ? money(type === "RTI" ? pricing.rti : pricing.legalNotice, pricing.currency) : "₹299";

  async function runCheck() {
    if (!type) return;
    setError(""); setBusy(true);
    try {
      setResult(await publicApi<QuickCheck>("/public/quick-check", { method: "POST", body: JSON.stringify({ statement: statement.trim(), type }) }));
      success();
      setStep("result");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  function next() {
    setError("");
    if (step === "describe") {
      if (statement.trim().length < 30) return setError("Write a few more sentences so we can understand what happened.");
      if (type === "RTI") return setStep("authority");
      return void runCheck();
    }
    if (step === "authority") {
      if (!authorityId) return setError("Choose the public authority.");
      return void runCheck();
    }
  }

  function save(path: "/signup" | "/login") {
    if (type) saveDraft({ type, statement, authorityId: authorityId || undefined, subject: subject || undefined });
    router.push(path);
  }

  const footer =
    step === "describe" || step === "authority" ? (
      <>
        <Message error={error} />
        <Button title={type === "RTI" && step === "describe" ? "Next" : "Check my case"} onPress={next} loading={busy} />
      </>
    ) : step === "result" ? (
      <>
        <Button title="Create a free account to continue" onPress={() => save("/signup")} />
        <Pressable onPress={() => save("/login")} style={{ alignSelf: "center", paddingVertical: 6 }} hitSlop={8}><Text style={s.link}>I already have an account</Text></Pressable>
      </>
    ) : undefined;

  return (
    <AppScreen left={step === "type" ? undefined : <BarButton icon="chevron-back" label="Back" onPress={back} />} footer={footer}>
      {step !== "type" && <Progress step={index + 1} total={order.length} label={type === "RTI" ? "RTI application" : "Legal notice"} />}

      {step === "type" && (
        <>
          <Text style={s.title}>What would you like to prepare?</Text>
          <Body muted style={{ marginBottom: 18 }}>No account needed. We ask you to sign up only when you want to save and continue.</Body>
          <View style={{ gap: 14 }}>
            <PhotoCard photo={courts.bombayHighCourt} title="A legal notice" text="Money owed, a deposit or refund, a broken agreement, a consumer or property dispute." onPress={() => { setType("LEGAL_NOTICE"); setStep("describe"); }} />
            <PhotoCard photo={courts.supremeCourt} title="An RTI application" text="Records and decisions from a public authority." onPress={() => { setType("RTI"); setStep("describe"); }} />
          </View>
        </>
      )}

      {step === "describe" && type && (
        <>
          <Text style={s.title}>What happened?</Text>
          <Body muted style={{ marginBottom: 14 }}>Write it the way you would tell a friend, in Hindi, English or a mix.</Body>
          <TextInput
            value={statement}
            onChangeText={(t) => { setStatement(t); setResult(null); }}
            multiline
            autoFocus={!statement}
            placeholder={prompts[type]}
            placeholderTextColor={colors.faint}
            style={s.editor}
            textAlignVertical="top"
            accessibilityLabel="What happened"
          />
          <Text style={s.count}>{statement.trim().length < 30 ? "A few sentences are enough" : "Saved on this phone as you type"}</Text>
        </>
      )}

      {step === "authority" && (
        <>
          <Text style={s.title}>Which office holds the records?</Text>
          <View style={{ gap: 10, marginBottom: 18 }}>
            {authorities.map((a) => {
              const on = a.id === authorityId;
              return (
                <Pressable key={a.id} onPress={() => { tap(); setAuthorityId(a.id); }} style={[s.option, on && s.optionOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={colors.ink} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.optionTitle}>{a.name}</Text>
                    <Body muted small>{a.governmentLevel.toLowerCase()}{a.state ? ` · ${a.state}` : ""}</Body>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.label}>Subject, in a few words (optional)</Text>
          <TextInput value={subject} onChangeText={setSubject} placeholder="What information do you want?" placeholderTextColor={colors.faint} style={s.input} />
        </>
      )}

      {step === "result" && result && (
        <>
          <Text style={s.title}>Here is what we understood</Text>
          <View style={s.box}><Body>{result.summary}</Body></View>
          {result.facts.length > 0 && (
            <>
              <Text style={s.label}>Facts we found</Text>
              <View style={s.box}>
                {result.facts.map((f, i) => (
                  <View key={f.key + f.value} style={[s.fact, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
                    <Text style={s.factKey}>{f.key.replace(/_/g, " ")}</Text>
                    <Text style={s.factValue}>{f.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {result.needed.length > 0 && (
            <>
              <Text style={s.label}>What we would ask you next</Text>
              <View style={s.box}>{result.needed.map((q) => <Body key={q} style={{ marginBottom: 6 }}>• {q}</Body>)}</View>
            </>
          )}
          <Text style={s.label}>Next</Text>
          <View style={s.box}>
            <Body>Save this to answer the questions, add documents and confirm your facts. The {result.document.toLowerCase()} costs {price}, paid only when you are ready, and is usually ready within 24 hours of verified payment.</Body>
          </View>
          <Pressable onPress={() => { clearDraft(); setStatement(""); setSubject(""); setAuthorityId(""); setResult(null); setStep("describe"); }} style={{ marginTop: 18 }}><Text style={s.link}>Start over</Text></Pressable>
        </>
      )}
    </AppScreen>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: colors.ink, marginBottom: 10 },
  editor: { minHeight: 260, fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, color: colors.ink, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 16 },
  count: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, marginTop: 8 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted, marginTop: 20, marginBottom: 8 },
  input: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  optionOn: { borderColor: colors.ink, backgroundColor: colors.tint },
  optionTitle: { fontFamily: fonts.sansMedium, fontSize: 15.5, color: colors.ink },
  box: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 16 },
  fact: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  factKey: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted, textTransform: "capitalize", marginBottom: 2 },
  factValue: { fontFamily: fonts.sansMedium, fontSize: 15.5, color: colors.ink },
  link: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink, textDecorationLine: "underline" },
});
