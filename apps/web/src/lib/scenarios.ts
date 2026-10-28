// Everyday situations where a legal notice is usually the first step. Picking one fills the
// home page box with a starter sentence; the [blanks] make sure no fact is invented for the user.
export type Scenario = { title: string; example: string };

export const scenarios: Scenario[] = [
  { title: "Salary not paid", example: "My employer [company name] has not paid my salary of ₹[amount] for [months]. I left the job on [date]." },
  { title: "Deposit kept", example: "I paid a security deposit of ₹[amount] for a flat in [city]. I moved out on [date] and the landlord won't return it." },
  { title: "Money lent, not returned", example: "I lent ₹[amount] to [name] on [date]. They promised to repay by [date] and now avoid my calls." },
  { title: "Cheque bounced", example: "[Name] gave me a cheque for ₹[amount] that bounced on [date]." },
  { title: "Refund refused", example: "I bought [product or service] from [seller] for ₹[amount] on [date]. It was faulty and they refuse to refund me." },
];

export const PICK_EVENT = "lawmedy:pick";
