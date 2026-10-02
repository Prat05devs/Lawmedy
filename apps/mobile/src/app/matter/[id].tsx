import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Body, Eyebrow, H1, Loading, Message, StatusBadge } from "@/components/ui";
import { useApi, shortDate } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import { progressNote } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import type { Matter, Overview } from "@/lib/types";
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

const isWorking = (o: Overview) =>
  o.intake?.status === "RUNNING" ||
  o.evidence.some((e) => e.status === "PROCESSING") ||
  o.document.state === "PROCESSING" ||
  o.finalDocument.state === "PENDING" ||
  BUSY.includes(o.matter.status);

export default function MatterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // One API call returns the matter and every panel's data.
  const overview = useApi<Overview>(`/matters/${encodeURIComponent(id)}/overview`, isWorking);
  const [refreshing, setRefreshing] = useState(false);
  const reloadAll = () => overview.reload();

  if (overview.loading && !overview.data) return <Loading />;
  if (!overview.data) return <View style={{ padding: 20 }}><Message error={overview.error || "This matter could not be found."} /></View>;
  const { matter: mt, intake, evidence, review, document: draft, advocateRequests, finalDocument, authorities, rtiDetails } = overview.data;
  const isRti = mt.type === "RTI";
  const latest = mt.statements.find((s) => s.id === mt.currentStatementId) ?? mt.statements[0];
  const editable = mt.status === "DRAFT" || mt.status === "INTAKE_IN_PROGRESS";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reloadAll(); setRefreshing(false); }} />}>
        <Eyebrow>{mt.referenceNumber}</Eyebrow>
        <H1>{isRti ? "Your RTI application" : "Your legal notice"}</H1>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.muted, marginBottom: 12 }}>Started {shortDate(mt.createdAt)}</Text>
        <View style={{ marginBottom: 20 }}><StatusBadge status={mt.status} /></View>
        <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, marginBottom: 18 }}>
          <Ionicons name={mt.status === "COMPLETED" ? "checkmark-circle" : "information-circle-outline"} size={22} color={mt.status === "COMPLETED" ? colors.ok : colors.navy2} />
          <Body style={{ flex: 1, fontSize: 14 }}>{progressNote[mt.status]}</Body>
        </View>

        <StatementPanel matter={mt} editable={editable} onChanged={reloadAll} />
        {latest && intake && <IntakePanel matterId={mt.id} intake={intake} editable={editable} onChanged={reloadAll} />}
        {isRti && <RtiDetailsPanel matterId={mt.id} authorities={authorities} details={rtiDetails} editable={editable} onChanged={reloadAll} />}
        {latest && <EvidencePanel matterId={mt.id} items={evidence} editable={editable} step={isRti ? "04" : "03"} onChanged={reloadAll} />}
        {review && <ReviewPanel matterId={mt.id} review={review} step={isRti ? "05" : "04"} onChanged={reloadAll} />}
        {review && <PaymentPanel matterId={mt.id} review={review} step={isRti ? "06" : "05"} onChanged={reloadAll} />}
        <DraftPanel matterId={mt.id} draft={draft} step={isRti ? "07" : "06"} onChanged={reloadAll} />
        {advocateRequests && <AdvocatePanel matterId={mt.id} data={advocateRequests} step="07" onChanged={reloadAll} />}
        <FinalPanel matterId={mt.id} doc={finalDocument} type={mt.type} step="08" onChanged={reloadAll} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
