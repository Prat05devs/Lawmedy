export function canonicalFactType(value: string) {
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (/amount|money|loan|payment|price|value/.test(key)) return "amount";
  if (/date|when|deadline|period/.test(key)) return "date";
  if (/address|location/.test(key)) return "recipient_address";
  if (/phone|mobile|contact_number/.test(key)) return "recipient_phone";
  if (/email/.test(key)) return "recipient_email";
  if (/name|recipient|person|opponent|borrower/.test(key))
    return "recipient_name";
  return key.slice(0, 80) || "other";
}

export function normalizeFactValue(type: string, value: string) {
  const text = value.trim().toLowerCase();
  if (type === "amount") {
    const number = text.match(/\d[\d,]*(?:\.\d+)?/u)?.[0];
    return number ? number.replaceAll(",", "") : "";
  }
  return text.replace(/\s+/g, " ").replace(/[.,]+$/g, "");
}
