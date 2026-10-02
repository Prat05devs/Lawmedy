import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Body, Eyebrow, H1, Loading, Message, StatusBadge } from "@/components/ui";
import { useApi, shortDate } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import { progressNote } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import type { AdvocateRequests, EvidenceItem, FinalDocument, Intake, Matter, MatterDocument, MatterReview, PublicAuthority, RtiDetail } from "@/lib/types";
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

export default function MatterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = encodeURIComponent(id);
  const matter = useApi<Matter>(`/matters/${m}`, (d) => BUSY.includes(d.status));
  const latest = matter.data ? matter.data.statements.find((s) => s.id === matter.data!.currentStatementId) ?? matter.data.statements[0] : undefined;
  const isRti = matter.data?.type === "RTI";
  const intake = useApi<Intake>(latest ? `/matters/${m}/intake` : null, (d) => d.status === "RUNNING");
  const evidence = useApi<EvidenceItem[]>(matter.data ? `/matters/${m}/evidence` : null, (d) => d.some((e) => e.status === "PROCESSING"));
  const review = useApi<MatterReview>(latest ? `/matters/${m}/review` : null);
  const draft = useApi<MatterDocument>(matter.data ? `/matters/${m}/document` : null, (d) => d.state === "PROCESSING");
  const advocate = useApi<AdvocateRequests>(matter.data && !isRti ? `/matters/${m}/advocate-requests` : null, () => matter.data?.status === "UNDER_ADVOCATE_REVIEW");
  const finalDoc = useApi<FinalDocument>(matter.data ? `/matters/${m}/final-document` : null, (d) => d.state === "PENDING");
  const authorities = useApi<PublicAuthority[]>(isRti ? "/matters/rti/public-authorities" : null);
  const rti = useApi<RtiDetail | null>(isRti ? `/matters/${m}/rti-details` : null);
  const [refreshing, setRefreshing] = useState(false);

  const reloadAll = async () => {
    await matter.reload();
    await Promise.all([intake.reload(), evidence.reload(), review.reload(), draft.reload(), advocate.reload(), finalDoc.reload(), rti.reload()]);
  };

  if (matter.loading && !matter.data) return <Loading />;
  if (!matter.data) return <View style={{ padding: 20 }}><Message error={matter.error || "This matter could not be found."} /></View>;
  const mt = matter.data;
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
        {latest && intake.data && <IntakePanel matterId={mt.id} intake={intake.data} editable={editable} onChanged={reloadAll} />}
        {isRti && authorities.data && <RtiDetailsPanel matterId={mt.id} authorities={authorities.data} details={rti.data ?? null} editable={editable} onChanged={reloadAll} />}
        {latest && <EvidencePanel matterId={mt.id} items={evidence.data ?? []} editable={editable} step={isRti ? "04" : "03"} onChanged={reloadAll} />}
        {review.data && <ReviewPanel matterId={mt.id} review={review.data} step={isRti ? "05" : "04"} onChanged={reloadAll} />}
        {review.data && <PaymentPanel matterId={mt.id} review={review.data} step={isRti ? "06" : "05"} onChanged={reloadAll} />}
        {draft.data && <DraftPanel matterId={mt.id} draft={draft.data} step={isRti ? "07" : "06"} onChanged={reloadAll} />}
        {advocate.data && <AdvocatePanel matterId={mt.id} data={advocate.data} step="07" onChanged={reloadAll} />}
        {finalDoc.data && <FinalPanel matterId={mt.id} doc={finalDoc.data} type={mt.type} step="08" onChanged={reloadAll} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
