const has = (tokens: string[], words: string[]) => tokens.some((token) => words.includes(token));

const AMOUNT_WORDS = ["amount", "money", "sum", "rs", "inr", "rupees", "price", "value", "cost", "fee", "fees", "salary", "rent", "balance"];
const DATE_WORDS = ["date", "when", "deadline", "period", "day", "month", "year", "time"];
const PARTY_WORDS = ["name", "person", "opponent", "borrower", "debtor", "defendant", "landlord", "employer", "seller", "company"];
const SENDER_WORDS = ["sender", "complainant", "applicant", "user", "my", "claimant", "lender", "plaintiff"];

// Facts are only compared with each other when they describe the same thing.
// A loan amount and an interest amount, or an agreement date and a due date,
// must never be forced into one slot.
function amountQualifier(tokens: string[]) {
  if (has(tokens, ["interest"])) return "interest";
  if (has(tokens, ["penalty", "fine", "damages", "compensation", "refund"])) return "compensation";
  if (has(tokens, ["fee", "fees", "cost", "costs"])) return "cost";
  if (has(tokens, ["salary", "wages", "wage"])) return "salary";
  if (has(tokens, ["rent", "deposit"])) return "rent";
  return "principal";
}

function dateQualifier(tokens: string[]) {
  if (has(tokens, ["due", "deadline", "repay", "repayment", "return", "expiry"])) return "due";
  if (has(tokens, ["notice", "demand", "reminder", "contact", "complaint", "reported", "last"])) return "followup";
  return "event";
}

export function canonicalFactType(value: string) {
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const tokens = key.split("_").filter(Boolean);
  if (has(tokens, ["phone", "mobile", "telephone"])) return "recipient_phone";
  if (has(tokens, ["email", "mail"])) return "recipient_email";
  // Date words win over amount words: "payment_date" is a date, not an amount.
  if (has(tokens, DATE_WORDS)) return `date:${dateQualifier(tokens)}`;
  if (has(tokens, AMOUNT_WORDS) || has(tokens, ["loan", "loaned", "lent", "borrowed", "payment", "paid", "transfer", "transferred"]))
    return `amount:${amountQualifier(tokens)}`;
  if (has(tokens, SENDER_WORDS) && has(tokens, ["address", "location"])) return "sender_address";
  if (has(tokens, SENDER_WORDS) && has(tokens, ["name"])) return "sender_name";
  if (has(tokens, ["address", "location", "residence"])) return "recipient_address";
  if (has(tokens, PARTY_WORDS) || has(tokens, ["recipient"])) return "recipient_name";
  return key.slice(0, 80) || "other";
}

export function normalizeFactValue(type: string, value: string) {
  const text = value.trim().toLowerCase();
  if (type.startsWith("amount")) {
    const numbers = [...text.matchAll(/\d[\d,]*(?:\.\d+)?/gu)].map((match) => ({
      raw: match[0].replaceAll(",", ""),
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }));
    if (!numbers.length) return "";
    // Prefer the figure tied to a currency marker; otherwise the largest figure.
    const marked = numbers.find((number) =>
      /(?:₹|rs\.?|inr)\s*$/u.test(text.slice(0, number.index)) || /^\s*(?:rupees|rs\b|inr\b|\/-)/u.test(text.slice(number.end)),
    );
    const chosen = marked ?? numbers.reduce((best, number) => (Number(number.raw) > Number(best.raw) ? number : best));
    return String(Number(chosen.raw));
  }
  return text.replace(/\s+/g, " ").replace(/[.,]+$/g, "");
}
