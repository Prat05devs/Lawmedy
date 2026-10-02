import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Card, Message, PanelHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage, money } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { CheckoutDetails, MatterReview } from "@/lib/types";

const checkoutHtml = (c: CheckoutDetails) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f7f8fb;font-family:-apple-system,sans-serif"><p style="padding:24px;color:#667086">Opening secure checkout…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  try {
    var rzp = new Razorpay({
      key: ${JSON.stringify(c.keyId)}, order_id: ${JSON.stringify(c.orderId)}, amount: ${c.amount}, currency: ${JSON.stringify(c.currency)},
      name: ${JSON.stringify(c.name)}, description: ${JSON.stringify(c.description)}, prefill: ${JSON.stringify(c.prefill)},
      theme: { color: "#0f2147" },
      handler: function (r) { post({ type: "success", payload: r }); },
      modal: { ondismiss: function () { post({ type: "dismiss" }); } }
    });
    rzp.on("payment.failed", function (e) { post({ type: "failed", message: e.error && e.error.description }); });
    rzp.open();
  } catch (e) { post({ type: "error" }); }
</script></body></html>`;

export function PaymentPanel({ matterId, review, step, onChanged }: { matterId: string; review: MatterReview; step: string; onChanged: () => void }) {
  const [checkout, setCheckout] = useState<CheckoutDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const paid = review.status !== "READY_FOR_PAYMENT" || review.payment?.status === "PAID";

  async function start() {
    setBusy(true); setError("");
    try { setCheckout(await post<CheckoutDetails>(`/matters/${matterId}/payment/order`)); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function onMessage(raw: string) {
    let msg: { type: string; payload?: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }; message?: string };
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "success" && msg.payload) {
      setCheckout(null); setBusy(true);
      try {
        await post(`/matters/${matterId}/payment/verify`, { orderId: msg.payload.razorpay_order_id, paymentId: msg.payload.razorpay_payment_id, signature: msg.payload.razorpay_signature });
        setOk("Payment received. We are preparing your draft.");
      } catch { setOk("Payment received. We are confirming it with the bank. This page updates shortly."); }
      finally { setBusy(false); onChanged(); }
    } else if (msg.type === "failed") { setCheckout(null); setError(msg.message || "The payment did not go through. You have not been charged twice."); }
    else if (msg.type === "dismiss") setCheckout(null);
    else if (msg.type === "error") { setCheckout(null); setError("Secure checkout could not load. Check your connection and try again."); }
  }

  if (review.status !== "READY_FOR_PAYMENT" && review.status !== "PAID") return null;
  return (
    <Card>
      <PanelHeader step={step} title="Payment" subtitle="One payment per document." />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <Text style={{ fontFamily: fonts.sans, color: colors.muted }}>Document fee</Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.ink }}>{money(review.pricing.amount, review.pricing.currency)}</Text>
      </View>
      {paid ? (
        <Message success="Payment received." />
      ) : review.paymentConfigured ? (
        <Button title={`Pay ${money(review.pricing.amount, review.pricing.currency)}`} icon="lock-closed-outline" variant="gold" onPress={start} loading={busy} />
      ) : (
        <Body muted>Payments are not switched on yet for this environment.</Body>
      )}
      <Message error={error} success={ok} />
      <Modal visible={!!checkout} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCheckout(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f8fb" }}>
          <Pressable onPress={() => setCheckout(null)} style={{ padding: 16 }}><Text style={{ fontFamily: fonts.sansMedium, color: colors.navy }}>Close</Text></Pressable>
          {checkout && <WebView originWhitelist={["*"]} source={{ html: checkoutHtml(checkout), baseUrl: "https://checkout.razorpay.com" }} onMessage={(e) => void onMessage(e.nativeEvent.data)} startInLoadingState renderLoading={() => <ActivityIndicator style={{ marginTop: 40 }} />} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} />}
        </SafeAreaView>
      </Modal>
    </Card>
  );
}
