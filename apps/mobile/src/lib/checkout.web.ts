import type { CheckoutDetails, CheckoutResult } from "./checkout";

type Instance = { open(): void; on(event: string, callback: () => void): void };
type CheckoutWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => Instance };
let loading: Promise<void> | undefined;
function load() {
  if ((window as CheckoutWindow).Razorpay) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => { script.remove(); loading = undefined; reject(new Error("Checkout timed out. Try again.")); }, 15000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); loading = undefined; reject(new Error("Checkout could not load. Try again.")); };
    document.head.appendChild(script);
  });
  return loading;
}
export async function openCheckout(checkout: CheckoutDetails): Promise<CheckoutResult> {
  await load();
  return new Promise((resolve, reject) => {
    const Razorpay = (window as CheckoutWindow).Razorpay;
    if (!Razorpay) return reject(new Error("Checkout could not load."));
    const instance = new Razorpay({
      key: checkout.keyId, order_id: checkout.orderId, amount: checkout.amount,
      currency: checkout.currency, name: checkout.name, description: checkout.description,
      prefill: checkout.prefill, handler: resolve, theme: { color: "#29483e" },
      modal: { ondismiss: () => reject({ code: 0 }) },
    });
    instance.on("payment.failed", () => reject(new Error("Payment did not complete. Try again.")));
    instance.open();
  });
}
