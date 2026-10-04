import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarButton, tap } from "@/components/app-ui";
import { Body, Loading, Message, PanelHeaderVisible, StatusBadge } from "@/components/ui";
import { useApi, shortDate } from "@/lib/hooks";
import { colors, fonts, radius } from "@/lib/theme";
import { progressNote, type Matter, type Overview } from "@/lib/types";
import { StatementPanel } from "@/components/matter/statement";
import { IntakePanel } from "@/components/matter/intake";
import { RtiDetailsPanel } from "@/components/matter/rti-details";
import { EvidencePanel } from "@/components/matter/evidence";
import { ReviewPanel } from "@/components/matter/review";
import { PaymentPanel } from "@/components/matter/payment";
import { DraftPanel } from "@/components/matter/draft";
import { AdvocatePanel } from "@/components/matter/advocate";
import { FinalPanel } from "@/components/matter/final";

const BUSY: Matter["status"][] = ["PAYMENT_VERIFICATION", "PAID", "AI_PROCESSING", "DRAFT_GENERATED", "UNDER_ADVOCATE_REVIEW", "APPROVED"];
const RANK: Record<Matter["status"], number> = {
  DRAFT: 0, INTAKE_IN_PROGRESS: 1, READY_FOR_PAYMENT: 2, PAYMENT_VERIFICATION: 3, PAID: 4, AI_PROCESSING: 4,
  DRAFT_GENERATED: 5, UNDER_ADVOCATE_REVIEW: 6, USER_RESPONSE_REQUIRED: 6, APPROVED: 7, COMPLETED: 8,
};

const isWorking = (o: Overview) =>
  o.intake?.status === "RUNNING" ||
  o.evidence.some((e) => e.status === "PROCESSING") ||
  o.document.state === "PROCESSING" ||
  o.finalDocument.state === "PENDING" ||
  BUSY.includes(o.matter.status);

type Step = { key: string; title: string; done: boolean; optional?: boolean; render: () => React.ReactNode };

export default function MatterScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // One API call returns the matter and every step's data.
  const overview = useApi<Overview>(`/matters/${encodeURIComponent(id)}/overview`, isWorking);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const reload = () => overview.reload();

  const data = overview.data;
  const steps: Step[] = [];
  if (data) {
    const { matter: mt, intake, evidence, review, document: draft, advocateRequests, finalDocument, authorities, rtiDetails } = data;
    const rank = RANK[mt.status];
    const latest = mt.statements.find((s) => s.id === mt.currentStatementId) ?? mt.statements[0];
    const editable = mt.status === "DRAFT" || mt.status === "INTAKE_IN_PROGRESS";
    const questionsDone = rank >= 2 || (intake?.status === "SUCCEEDED" && (!!intake.allAnswered || !intake.analysis?.questions.length));
    steps.push({ key: "statement", title: "Tell us what happened", done: !!latest, render: () => <StatementPanel matter={mt} editable={editable} onChanged={reload} /> });
    steps.push({ key: "questions", title: "Answer a few questions", done: questionsDone, render: () => (intake ? <IntakePanel matterId={mt.id} intake={intake} editable={editable} onChanged={reload} /> : <Body muted>Available after you describe what happened.</Body>) });
    if (mt.type === "RTI") steps.push({ key: "authority", title: "Choose the public authority", done: rank >= 2 || !!rtiDetails, render: () => <RtiDetailsPanel matterId={mt.id} authorities={authorities} details={rtiDetails} editable={editable} onChanged={reload} /> });
    steps.push({ key: "documents", title: "Add documents", optional: true, done: rank >= 2 || evidence.length > 0, render: () => <EvidencePanel matterId={mt.id} items={evidence} editable={editable} step="" onChanged={reload} /> });
    steps.push({ key: "confirm", title: "Confirm your facts", done: rank >= 2, render: () => (review ? <ReviewPanel matterId={mt.id} review={review} step="" onChanged={reload} /> : <Body muted>Available after you describe what happened.</Body>) });
    steps.push({ key: "payment", title: "Pay the fee", done: rank >= 4, render: () => (review ? <PaymentPanel matterId={mt.id} review={review} step="" onChanged={reload} /> : null) });
    steps.push({ key: "draft", title: "Your draft is prepared", done: draft.state === "READY" || rank >= 6, render: () => (draft.state === "NOT_STARTED" ? <Body muted>We start drafting as soon as your payment is verified.</Body> : <DraftPanel matterId={mt.id} draft={draft} step="" onChanged={reload} />) });
    steps.push({ key: "advocate", title: "Advocate review", done: rank >= 7, render: () => (advocateRequests && advocateRequests.requests.length ? <AdvocatePanel matterId={mt.id} data={advocateRequests} step="" onChanged={reload} /> : <Body muted>{mt.status === "UNDER_ADVOCATE_REVIEW" ? "Our advocate is reviewing your document. If they need anything, you will see their question here." : "Our in-house advocate reviews your draft before you receive it."}</Body>) });
    steps.push({ key: "final", title: "Download your PDF", done: rank === 8, render: () => (finalDocument.state === "NOT_READY" ? <Body muted>Available once the advocate approves your document.</Body> : <FinalPanel matterId={mt.id} doc={finalDocument} type={mt.type} step="" onChanged={reload} />) });
  }
  const current = steps.find((s) => !s.done && !s.optional)?.key ?? steps[steps.length - 1]?.key;
  const currentIndex = steps.findIndex((s) => s.key === current);
  useEffect(() => { setOpen(current ?? null); }, [current]);

  if (overview.loading && !data) return <Loading />;
  if (!data) return <View style={{ padding: 20 }}><Message error={overview.error || "This matter could not be found."} /></View>;
  const mt = data.matter;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={s.bar}><BarButton icon="chevron-left" label="Matters" onPress={() => router.back()} /></View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
          <Text maxFontSizeMultiplier={1.3} style={s.title}>{mt.type === "RTI" ? "RTI application" : "Legal notice"}</Text>
          <Text style={s.meta}>{mt.referenceNumber} · started {shortDate(mt.createdAt)}</Text>
          <View style={{ marginTop: 10 }}><StatusBadge status={mt.status} /></View>
          <View style={s.note}><Body style={{ fontSize: 15 }}>{progressNote[mt.status]}</Body></View>

          <PanelHeaderVisible.Provider value={false}>
            <View style={s.steps}>
              {steps.map((step, index) => {
                const state = step.done ? "done" : step.key === current ? "now" : index < currentIndex || step.optional ? "open" : "later";
                const expandable = state !== "later";
                const expanded = open === step.key && expandable;
                return (
                  <View key={step.key} style={[s.step, index === steps.length - 1 && { borderBottomWidth: 0 }]}>
                    <Pressable
                      disabled={!expandable}
                      onPress={() => { tap(); setOpen(expanded ? null : step.key); }}
                      style={s.stepHead}
                      accessibilityRole="button"
                      accessibilityState={{ expanded, disabled: !expandable }}
                    >
                      <View style={[s.dot, state === "done" && s.dotDone, state === "now" && s.dotNow]}>
                        {state === "done" ? <Feather name="check" size={14} color="#fff" /> : <Text style={[s.dotText, state === "now" && { color: "#fff" }]}>{index + 1}</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.stepTitle, state === "later" && { color: colors.muted }]}>{step.title}</Text>
                        <Text style={s.stepState}>{state === "done" ? "Done" : state === "now" ? "Your next step" : step.optional ? "Optional" : state === "open" ? "" : "Later"}</Text>
                      </View>
                      {expandable ? <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} /> : null}
                    </Pressable>
                    {expanded ? <View style={{ paddingTop: 4, paddingBottom: 8 }}>{step.render()}</View> : null}
                  </View>
                );
              })}
            </View>
          </PanelHeaderVisible.Provider>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: { height: 48, paddingHorizontal: 12, justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.8, color: colors.ink },
  meta: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.muted, marginTop: 4 },
  note: { marginTop: 14, padding: 14, borderRadius: radius.md, backgroundColor: colors.tint },
  steps: { marginTop: 18, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  step: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: colors.ok, borderColor: colors.ok },
  dotNow: { backgroundColor: colors.ink, borderColor: colors.ink },
  dotText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.muted },
  stepTitle: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  stepState: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted, marginTop: 1 },
});
