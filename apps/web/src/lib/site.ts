// Public contact details shown on the legal and support pages.
// Override with environment variables in each deployment.
export const site = {
  name: "Lawmedy",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.lawmedy.in",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admin@wtsolutions.cc",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admin@wtsolutions.cc",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  priceLabel: process.env.NEXT_PUBLIC_PRICE_LABEL || "₹299",
  updated: "4 October 2026",
};
