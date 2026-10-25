// The final PDF is shared by the Lawmedy team on WhatsApp, so the number is stored as
// +<country code><number>. A bare 10-digit Indian mobile number gets +91.
export function normalizeWhatsapp(input: string): string | null {
  const value = input.replace(/[\s\-().]/g, "");
  if (/^0?[6-9]\d{9}$/.test(value)) return `+91${value.slice(-10)}`;
  if (/^(\+|00)?91[6-9]\d{9}$/.test(value)) return `+91${value.slice(-10)}`;
  // Other countries; an Indian number that failed the checks above is not valid.
  if (/^\+[1-9]\d{7,14}$/.test(value) && !value.startsWith("+91")) return value;
  return null;
}
