// Vetted statutory references a legal notice may rely on. The model can only
// pick ids from this list; the wording that appears in the notice is ours, so
// a citation can never be invented. An advocate still reviews every notice.
export type LegalBasis = {
  id: string;
  categories: string[];
  appliesWhen: string;
  text: string;
};

export const LEGAL_BASIS: LegalBasis[] = [
  {
    id: "ICA_S73",
    categories: ["MONEY_RECOVERY", "CONSUMER", "PROPERTY_DISPUTE"],
    appliesWhen: "A contract or agreed arrangement exists and the other party failed to perform it.",
    text: "Section 73 of the Indian Contract Act, 1872, under which a party who suffers loss because of a breach of contract is entitled to compensation from the party in breach.",
  },
  {
    id: "INTEREST_ACT_S3",
    categories: ["MONEY_RECOVERY"],
    appliesWhen: "A specific sum of money is due and unpaid.",
    text: "Section 3 of the Interest Act, 1978, which permits interest to be claimed on debts and damages.",
  },
  {
    id: "NI_ACT_S138",
    categories: ["MONEY_RECOVERY"],
    appliesWhen: "Only when the confirmed facts state that a cheque was issued and was returned unpaid or dishonoured.",
    text: "Section 138 of the Negotiable Instruments Act, 1881, which treats the dishonour of a cheque for insufficiency of funds as an offence.",
  },
  {
    id: "CPA_2019",
    categories: ["CONSUMER"],
    appliesWhen: "The facts describe defective goods or deficient service that was paid for.",
    text: "the Consumer Protection Act, 2019, which provides remedies against defective goods and deficiency in services.",
  },
  {
    id: "SRA_1963",
    categories: ["PROPERTY_DISPUTE"],
    appliesWhen: "The facts describe a property agreement that the other party is not honouring.",
    text: "the Specific Relief Act, 1963, which provides for specific performance of contracts and for injunctions.",
  },
];

export const LEGAL_BASIS_IDS = LEGAL_BASIS.map((item) => item.id) as [string, ...string[]];

export function legalBasisFor(category: string) {
  return LEGAL_BASIS.filter((item) => item.categories.includes(category));
}

export function legalBasisText(ids: string[]) {
  return ids.flatMap((id) => LEGAL_BASIS.find((item) => item.id === id)?.text ?? []);
}
