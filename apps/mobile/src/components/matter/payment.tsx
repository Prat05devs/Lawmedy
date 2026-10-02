import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage, money, shortDate } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { MatterReview } from "@/lib/types";

// Manual payment: the user pays on a hosted payment page, then submits the payment
// reference. Our team verifies it and the matter moves forward.
export function PaymentPanel({ matterId, review, step, onChanged }: { matterId: string; review: MatterReview; step: string; onChanged: () => void }) {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amount = money(review.pricing.amount, review.pricing.currency);
  const rupees = String(review.pricing.amount / 100);
  const label = review.matterType === "RTI" ? "RTI application" : "Legal notice";

  async function submit() {
    setError("");
    if (reference.trim().length < 6) return setError("Enter the payment reference exactly as shown on your receipt.");
    setBusy(true);
    try { await post(`/matters/${matterId}/payment/manual`, { reference: reference.trim() }); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  if (review.status === "PAID") {
    return (
      <Card>
        <PanelHeader step={step} title="Payment verified" subtitle={`Your ${label.toLowerCase()} is now in progress.`} />
        <Message success={`Payment of ${amount} confirmed. Our team is working on your document. It usually takes 24 hours or less.`} />
      </Card>
    );
  }
  if (review.status === "PAYMENT_VERIFICATION") {
    return (
      <Card>
        <PanelHeader step={step} title="Payment under verification" subtitle="We are matching your payment." />
        <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.warnBg }}>
          <Ionicons name="hourglass-outline" size={22} color="#8a6414" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansMedium, color: "#6b4d10" }}>Reference {review.payment?.providerPaymentId}</Text>
            <Body small style={{ color: "#6b4d10", marginTop: 4 }}>
              {review.payment?.submittedAt ? `Submitted ${shortDate(review.payment.submittedAt)}. ` : ""}
              Nothing else to do. We will notify you as soon as it is verified, and your document work starts right after.
            </Body>
          </View>
        </View>
      </Card>
    );
  }
  if (review.status !== "READY_FOR_PAYMENT") return null;
  const rejected = review.payment?.status === "REJECTED";
  return (
    <Card>
      <PanelHeader step={step} title="Pay the fee" subtitle="Two quick steps. We verify every payment by hand." />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <Text style={{ fontFamily: fonts.sans, color: colors.muted }}>Drafting and review</Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.ink }}>{amount}</Text>
      </View>
      {rejected && <Message error={`We could not verify your last payment. ${review.payment?.reviewNote ?? ""} Please pay and submit the reference again.`} />}
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4, color: colors.gold, marginTop: 10 }}>STEP 1</Text>
      <Body style={{ marginVertical: 6 }}>Open our payment page and enter exactly <Text style={{ fontFamily: fonts.sansBold }}>{rupees}</Text> as the amount, then complete the payment.</Body>
      <Button title="Open payment page" icon="open-outline" variant="gold" onPress={() => Linking.openURL(review.paymentLink)} />
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4, color: colors.gold, marginTop: 22 }}>STEP 2</Text>
      <Body style={{ marginVertical: 6 }}>After paying you get a payment ID or UTR number. Enter it below so we can match your payment.</Body>
      <Field label="Payment reference" value={reference} onChangeText={setReference} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. PAY_ABC123 or UTR number" />
      <Message error={error} />
      <Button title="I have paid, submit reference" icon="shield-checkmark-outline" onPress={submit} loading={busy} style={{ marginTop: 10 }} />
      <Body muted small style={{ marginTop: 10 }}>Your document work starts only after we verify the payment. A wrong amount or reference cannot be matched.</Body>
    </Card>
  );
}
