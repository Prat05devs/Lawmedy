import React, { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Body, Button, Card, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { MatterDocument, NoticeContent, RtiContent, CertificateContent } from "@/lib/types";

export function DraftPanel({ matterId, draft, step, onChanged }: { matterId: string; draft: MatterDocument; step: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (draft.state === "NOT_STARTED") return null;

  async function retry() {
    setBusy(true); setError("");
    try { await post(`/matters/${matterId}/document/retry`, undefined, 160000); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <Card>
      <PanelHeader step={step} title="Your draft" subtitle="Prepared from the facts you confirmed." />
      {draft.state === "PROCESSING" && <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><ActivityIndicator color={colors.navy} /><Body muted>Drafting your document. This takes a minute or two.</Body></View>}
      {draft.state === "WAITING_FOR_CONFIGURATION" && <Message error={draft.message || "Drafting is not switched on yet."} />}
      {draft.state === "MISSING_INFORMATION" && <Message error={draft.message || "We need a little more information before we can draft."} />}
      {draft.state === "FAILED" && (
        <>
          <Message error={draft.message || "We could not prepare the draft."} />
          <Button variant="outline" title="Try again" icon="refresh-cw" onPress={retry} loading={busy} style={{ marginTop: 12 }} />
        </>
      )}
      {draft.state === "READY" && draft.document && (
        draft.matterType === "LENDING_CERTIFICATE" ? <Certificate c={draft.document.content as CertificateContent} /> : draft.matterType === "RTI" ? <Rti c={draft.document.content as RtiContent} /> : <Notice c={draft.document.content as NoticeContent} />
      )}
      <Message error={error} />
    </Card>
  );
}

const Label = ({ children }: { children: string }) => <Text style={{ fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 1.6, color: colors.gold, marginTop: 14, marginBottom: 4 }}>{children}</Text>;

function Notice({ c }: { c: NoticeContent }) {
  return (
    <View>
      <Label>FROM</Label><Body>{c.sender.name}</Body>
      <Label>TO</Label><Body>{c.recipient.name}</Body>
      <Label>SUBJECT</Label><Body style={{ fontFamily: fonts.sansMedium }}>{c.subject}</Body>
      {c.paragraphs.map((p, i) => <Body key={i} style={{ marginTop: 10 }}>{p.text}</Body>)}
      <Label>DEMAND</Label><Body>{c.demand}</Body>
      <Label>TIME TO RESPOND</Label><Body>{c.responsePeriod}</Body>
    </View>
  );
}
function Rti({ c }: { c: RtiContent }) {
  return (
    <View>
      <Label>TO</Label><Body>{c.publicAuthority.name}</Body>
      <Label>SUBJECT</Label><Body style={{ fontFamily: fonts.sansMedium }}>{c.subject}</Body>
      <Label>INFORMATION REQUESTED</Label>
      {c.informationRequests.map((r, i) => <Body key={i} style={{ marginTop: 6 }}>{i + 1}. {r.text}</Body>)}
    </View>
  );
}

function Certificate({ c }: { c: CertificateContent }) {
  return <View><Label>LENDING CERTIFICATE DRAFT</Label><Body>{c.subject}</Body>
    <Label>LENDER</Label><Body>{c.lender.name}</Body><Label>BORROWER</Label><Body>{c.borrower.name}</Body>
    {c.paragraphs.map((p, i) => <Body key={i} style={{ marginTop: 10 }}>{p.text}</Body>)}
    <Body muted small style={{ marginTop: 12 }}>Our in-house advocate prepares the final signed and stamped PDF on their letterhead within 24 hours of verified payment and complete information.</Body>
  </View>;
}
