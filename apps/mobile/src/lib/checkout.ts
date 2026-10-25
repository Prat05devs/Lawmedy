export type CheckoutDetails = {
  keyId: string; orderId: string; amount: number; currency: string;
  name: string; description: string; prefill: { name: string; email: string };
};
export type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

export async function openCheckout(checkout: CheckoutDetails): Promise<CheckoutResult> {
  // Loaded only on payment, so Expo Go can still open the rest of the app.
  const { default: Razorpay } = await import("react-native-razorpay");
  return Razorpay.open({
    key: checkout.keyId, order_id: checkout.orderId, amount: checkout.amount,
    currency: checkout.currency, name: checkout.name, description: checkout.description,
    prefill: checkout.prefill, theme: { color: "#29483e" },
  });
}
