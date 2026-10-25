import type { MatterType } from "./types";
import type { Pricing } from "./public";
import { money } from "./hooks";

// Three document services; the everyday situations below them are use cases, not extra services.
export const services: { type: MatterType; title: string; text: string; priceKey: "legalNotice" | "rti" | "lendingCertificate"; icon: "file-text" | "book-open" | "file-plus" }[] = [
  { type: "LEGAL_NOTICE", title: "Legal notice", icon: "file-text", priceKey: "legalNotice", text: "Money owed, unpaid salary, rent or deposits, refunds, and property disputes. An advocate reviews your notice; you send the final PDF." },
  { type: "RTI", title: "RTI application", icon: "book-open", priceKey: "rti", text: "Request government records, file status, decisions or answer sheets. You file the application and pay the government fee directly to the authority." },
  { type: "LENDING_CERTIFICATE", title: "Lending certificate", icon: "file-plus", priceKey: "lendingCertificate", text: "Record money already paid or lent on our advocate’s letterhead, with their signature and stamp. PDF within 24 hours of verified payment and complete information. Not an affidavit or notarised document." },
];

export function servicePrice(pricing: Pricing | null, type: MatterType) {
  const service = services.find((item) => item.type === type)!;
  const amount = pricing?.[service.priceKey];
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 0
    ? money(amount, pricing!.currency)
    : "Fee shown at checkout";
}
