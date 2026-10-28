import type { MatterType } from "./types";

// Situations shown on "Which document fits?", grouped by the part of life they touch; the same
// list as the website. Legal-notice situations carry a starter sentence with [blanks] so no fact
// is invented for the user.
export type UseCase = { title: string; text: string; type: MatterType; example?: string };
export type LifeArea = { id: string; title: string; short: string; intro: string; cases: UseCase[] };

export const ctaFor: Record<MatterType, string> = {
  LEGAL_NOTICE: "Start my legal notice",
  RTI: "File an RTI application",
  LENDING_CERTIFICATE: "Start a lending certificate",
};

export const lifeAreas: LifeArea[] = [
  {
    id: "money", title: "Money owed to you", short: "Money owed",
    intro: "Loans to friends, bounced cheques and unpaid invoices. A written demand with a deadline is usually the first step.",
    cases: [
      { type: "LEGAL_NOTICE", title: "A friend borrowed money and stopped answering", text: "The notice sets out how much, when you paid it, and the date to repay by, in writing they can’t brush off.", example: "I lent ₹[amount] to [name] on [date]. They promised to repay by [date] and now avoid my calls." },
      { type: "LEGAL_NOTICE", title: "A cheque bounced", text: "The law gives you 30 days from the bank’s return memo to send a written demand. The other side then has 15 days to pay.", example: "[Name] gave me a cheque for ₹[amount] that bounced on [date]." },
      { type: "LEGAL_NOTICE", title: "A client hasn’t paid your invoice", text: "Lists the work, the invoice and the amount due, with a clear deadline before you take it further.", example: "I completed work for [client] and sent an invoice of ₹[amount] on [date]. They have not paid." },
      { type: "LENDING_CERTIFICATE", title: "You lent money and nothing is on paper", text: "Put the transfer on record now. If repayment stalls later, a legal notice has firm ground to stand on." },
    ],
  },
  {
    id: "renting", title: "Renting a home", short: "Renting",
    intro: "Deposits that don’t come back, rent that stops coming, and token money kept after a deal falls through.",
    cases: [
      { type: "LEGAL_NOTICE", title: "Landlord kept your security deposit", text: "States when you moved out and what you paid, and asks for it back within a set time.", example: "I paid a security deposit of ₹[amount] for a flat in [city]. I moved out on [date] and the landlord won’t return it." },
      { type: "LEGAL_NOTICE", title: "Tenant stopped paying rent", text: "Records the months unpaid and the amount due, and asks for payment.", example: "My tenant has not paid rent of ₹[amount] a month since [month] and does not answer my calls." },
      { type: "LEGAL_NOTICE", title: "Token money kept after the deal fell through", text: "Sets out the agreement, the payment and why it should be returned.", example: "I paid ₹[amount] as token money to [name] on [date] for [property]. The deal fell through and they won’t return it." },
    ],
  },
  {
    id: "work", title: "At work", short: "Work",
    intro: "Salary that stopped, a settlement that never came, or a provident fund claim that’s stuck.",
    cases: [
      { type: "LEGAL_NOTICE", title: "Salary not paid for months", text: "Lists the months and amounts owed and gives your employer a deadline to pay.", example: "My employer [company name] has not paid my salary of ₹[amount] for [months]. I left the job on [date]." },
      { type: "LEGAL_NOTICE", title: "Full and final settlement never arrived", text: "Records your last working day and what the settlement should include.", example: "I left [company name] on [date]. My full and final settlement of ₹[amount] has still not been paid." },
      { type: "RTI", title: "Your PF claim is stuck", text: "Ask the EPFO office for the status of your claim and the notings on your file." },
    ],
  },
  {
    id: "shopping", title: "Shopping and services", short: "Shopping",
    intro: "Faulty products, services never delivered, and refunds that keep getting refused.",
    cases: [
      { type: "LEGAL_NOTICE", title: "Refund refused for a faulty product", text: "Sets out the purchase, the fault and your request, and gives the seller a deadline.", example: "I bought [product or service] from [seller] for ₹[amount] on [date]. It was faulty and they refuse to refund me." },
      { type: "LEGAL_NOTICE", title: "Paid for a service that never happened", text: "Records what was promised, what you paid, and asks for the money back.", example: "I paid [business] ₹[amount] on [date] for [service]. They never provided it and won’t refund me." },
    ],
  },
  {
    id: "property", title: "Property and neighbours", short: "Property",
    intro: "Possession dates that keep moving, boundary arguments, and land records that never get updated.",
    cases: [
      { type: "LEGAL_NOTICE", title: "Builder keeps moving the possession date", text: "Records the promised date from your agreement and asks for possession or compensation.", example: "My builder [name] promised possession of my flat by [date] and keeps delaying it." },
      { type: "LEGAL_NOTICE", title: "A neighbour built over the boundary", text: "Sets out what happened and asks them to stop and restore it by a set date.", example: "My neighbour [name] at [address] built [what] over our shared boundary on [date] and refuses to remove it." },
      { type: "RTI", title: "Mutation or land record pending", text: "Ask the tehsil or revenue office for the status of your application and who is handling it." },
    ],
  },
  {
    id: "government", title: "Government offices", short: "Government",
    intro: "Every public authority has to answer an RTI application within 30 days. Use it when a file goes quiet.",
    cases: [
      { type: "RTI", title: "Pension, scholarship or subsidy stuck", text: "Ask for the file notings and the officer it’s pending with." },
      { type: "RTI", title: "Passport, ration card or certificate delayed", text: "Ask for the status of your application and the reason for the delay." },
      { type: "RTI", title: "Road or drain work announced, never done", text: "Ask the municipal body for the sanction order, the contractor and the money spent." },
      { type: "RTI", title: "A copy of your evaluated answer sheet", text: "Ask the exam body for a certified copy of your answer sheet." },
    ],
  },
  {
    id: "lending", title: "Lending to family and friends", short: "Lending",
    intro: "Help someone you trust, and still keep a clear record of what you gave and when it comes back.",
    cases: [
      { type: "LENDING_CERTIFICATE", title: "Lending to a cousin or friend", text: "Records the amount, the transfer and the repayment terms you give, on an advocate’s letterhead." },
      { type: "LENDING_CERTIFICATE", title: "An advance paid for a wedding venue or contractor", text: "Records money already paid, supported by your transfer record." },
      { type: "LENDING_CERTIFICATE", title: "Money already lent, nothing written down", text: "Puts it on record today, which helps if you ever need a legal notice later." },
    ],
  },
];
