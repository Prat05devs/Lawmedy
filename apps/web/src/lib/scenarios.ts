// Everyday situations where a legal notice is usually the first step. Picking one fills the
// home page box with a starter sentence; the [blanks] make sure no fact is invented for the user.
// Tone is the category colour: genda = money, mor = home and work, rani = shopping.
export type Tone = "genda" | "mor" | "rani";
export type Scenario = { title: string; example: string; tone: Tone };

export const scenarios: Scenario[] = [
  { title: "Salary not paid", tone: "mor", example: "My employer [company name] has not paid my salary of ₹[amount] for [months]. I left the job on [date]." },
  { title: "Deposit or token money kept", tone: "mor", example: "I paid a security deposit of ₹[amount] for a flat in [city]. I moved out on [date] and the landlord won't return it." },
  { title: "Tenant not paying rent", tone: "mor", example: "My tenant has not paid rent of ₹[amount] a month since [month] and does not answer my calls." },
  { title: "Money lent, not returned", tone: "genda", example: "I lent ₹[amount] to [name] on [date]. They promised to repay by [date] and now avoid my calls." },
  { title: "Cheque bounced", tone: "genda", example: "[Name] gave me a cheque for ₹[amount] that bounced on [date]." },
  { title: "Client not paying invoice", tone: "genda", example: "I completed work for [client] and sent an invoice of ₹[amount] on [date]. They have not paid." },
  { title: "Refund refused", tone: "rani", example: "I bought [product or service] from [seller] for ₹[amount] on [date]. It was faulty and they refuse to refund me." },
  { title: "Flat possession delayed", tone: "mor", example: "My builder [name] promised possession of my flat by [date] and keeps delaying it." },
];

export const categories: { title: string; tone: Tone | "ink"; text: string; items: string[] }[] = [
  { title: "Money owed to you", tone: "genda", text: "Loans to friends or family, bounced cheques, unpaid invoices.", items: ["Money lent, not returned", "Cheque bounced", "Client not paying invoice"] },
  { title: "Renting a home", tone: "mor", text: "Security deposit or token money, and rent that stopped coming.", items: ["Deposit or token money kept", "Tenant not paying rent"] },
  { title: "At work", tone: "mor", text: "Unpaid salary or a full and final settlement that never arrived.", items: ["Salary not paid"] },
  { title: "Shopping and services", tone: "rani", text: "Faulty products or services, and refunds that keep getting refused.", items: ["Refund refused"] },
  { title: "Property and builders", tone: "mor", text: "A builder who keeps moving the possession date.", items: ["Flat possession delayed"] },
];

export const PICK_EVENT = "lawmedy:pick";
