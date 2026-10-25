import React, { useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Body, Button, Card, Field, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage, money, shortDate } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { MatterReview } from "@/lib/types";
import { openCheckout, type CheckoutDetails, type CheckoutResult } from "@/lib/checkout";

// Manual payment: the user pays on a hosted payment page, then submits the payment
// reference. Our team verifies it and the matter moves forward.
export function PaymentPanel({ matterId, review, step, onChanged }: { matterId: string; review: MatterReview; step: string; onChanged: () => void }) {
  // Already-submitted manual references still need their original verification.
  if (review.paymentMode === "razorpay" && review.status !== "PAYMENT_VERIFICATION")
    return <OnlinePaymentPanel matterId={matterId} review={review} step={step} onChanged={onChanged} />;
  return <ManualPaymentPanel matterId={matterId} review={review} step={step} onChanged={onChanged} />;
}

function OnlinePaymentPanel({ matterId, review, step, onChanged }: { matterId: string; review: MatterReview; step: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);
  const paid = review.payment?.status === "PAID";

  async function pay() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError("");
    let result = receipt;
    try {
      if (!result) {
        const checkout = await post<CheckoutDetails>(`/matters/${matterId}/payment/order`, undefined, 35000);
        result = await openCheckout(checkout);
        setReceipt(result);
      }
      setPending(true);
      const verified = await post<{ status: "PAID" | "PENDING" }>(`/matters/${matterId}/payment/verify`, {
        orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature,
      });
      setPending(verified.status !== "PAID");
    } catch (e) {
      const cancelled = typeof e === "object" && e !== null && "code" in e && Number(e.code) === 0;
      setError(cancelled ? "Checkout closed. You can try again when ready." : result
        ? "Payment confirmation is pending. Check the status shortly; do not pay again."
        : "Checkout could not complete. Check your connection and try again.");
    } finally {
      onChanged(); setBusy(false); inFlight.current = false;
    }
  }

  if (review.status !== "READY_FOR_PAYMENT" && !paid) return null;
  return <Card>
    <PanelHeader step={step} title={paid ? "Payment verified" : "Pay the fee"} subtitle="Secure checkout with Razorpay." />
    {paid ? <Message success="Payment confirmed. Your document is now in progress." /> : <>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
        <Body>Drafting and review</Body><Body>{money(review.pricing.amount, review.pricing.currency)}</Body>
      </View>
      {review.paymentConfigured ? <Button title={receipt ? "Check payment status" : "Pay securely with Razorpay"} icon="credit-card" onPress={pay} loading={busy} />
        : <Body muted>Payment setup is pending. Your confirmed details are saved.</Body>}
      {pending && <Body muted style={{ marginTop: 12 }}>Your payment is being confirmed. You can return to this matter at any time.</Body>}
      <Message error={error} />
    </>}
  </Card>;
}

function ManualPaymentPanel({ matterId, review, step, onChanged }: { matterId: string; review: MatterReview; step: string; onChanged: () => void }) {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amount = money(review.pricing.amount, review.pricing.currency);
  const rupees = String(review.pricing.amount / 100);
  const label = review.matterType === "LENDING_CERTIFICATE" ? "Lending certificate" : review.matterType === "RTI" ? "RTI application" : "Legal notice";

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
          <Feather name="clock" size={22} color="#8a6414" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansMedium, color: colors.warnText }}>Reference {review.payment?.providerPaymentId}</Text>
            <Body small style={{ color: colors.warnText, marginTop: 4 }}>
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
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 29, letterSpacing: -0.8, color: colors.ink }}>{amount}</Text>
      </View>
      {rejected && <Message error={`We could not verify your last payment. ${review.payment?.reviewNote ?? ""} Please pay and submit the reference again.`} />}
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4, color: colors.gold, marginTop: 10 }}>STEP 1</Text>
      <Body style={{ marginVertical: 6 }}>Open our payment page and enter exactly <Text style={{ fontFamily: fonts.sansBold }}>{rupees}</Text> as the amount, then complete the payment.</Body>
      <Button title="Open payment page" icon="external-link" variant="gold" disabled={!review.paymentConfigured} onPress={() => { void Linking.openURL(review.paymentLink).catch(() => setError("The payment page could not open. Please try again.")); }} />
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4, color: colors.gold, marginTop: 22 }}>STEP 2</Text>
      <Body style={{ marginVertical: 6 }}>After paying you get a payment ID or UTR number. Enter it below so we can match your payment.</Body>
      <Field label="Payment reference" value={reference} onChangeText={setReference} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. PAY_ABC123 or UTR number" />
      <Message error={error} />
      <Button title="I have paid, submit reference" icon="shield" onPress={submit} loading={busy} style={{ marginTop: 10 }} />
      <Body muted small style={{ marginTop: 10 }}>Your document work starts only after we verify the payment. A wrong amount or reference cannot be matched.</Body>
    </Card>
  );
}
