// Public contact details shown on the legal and support pages.
// Override with environment variables in each deployment.
export const site = {
  name: "Lawmedy",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.lawmedy.in",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admin@wtsolutions.cc",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admin@wtsolutions.cc",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  priceLabel: process.env.NEXT_PUBLIC_PRICE_LABEL || "Fee shown at checkout",
  // Team Lawmedy's WhatsApp: finished PDFs are sent from this number. Digits with country code.
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "916399907916").replace(/\D/g, ""),
  updated: "4 October 2026",
};

// "+91 63999 07916" for display; wa.me link for a chat with the team.
export const whatsappDisplay = site.whatsapp.startsWith("91") && site.whatsapp.length === 12
  ? `+91 ${site.whatsapp.slice(2, 7)} ${site.whatsapp.slice(7)}`
  : `+${site.whatsapp}`;
export const whatsappLink = `https://wa.me/${site.whatsapp}`;
