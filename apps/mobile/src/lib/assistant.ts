// Preset questions and answers for the in-app assistant. These are written by the Lawmedy team,
// not generated, and each one describes what the product actually does today. Keep them in step
// with the API (intake, evidence extraction, drafting and QA prompts, advocate review).

export type AssistantAction = "notice" | "rti" | "sample" | "how" | "contact" | "advocate";
export type Topic = {
  id: string;
  question: string;
  // Each string is shown as its own chat bubble, one after another.
  answer: (ctx: { notice: string; rti: string }) => string[];
  action?: { label: string; to: AssistantAction };
};

export const topics: Topic[] = [
  {
    id: "ai",
    question: "How does Lawmedy use AI?",
    answer: () => [
      "We are proud to use AI, and we use it carefully. We built our own system on top of leading AI models so that it works the way a legal document needs to.",
      "The AI reads your problem, pulls out the facts, asks you about anything missing, reads your documents and writes the first draft in a fixed legal format.",
      "Our system then checks that draft line by line against your facts, and an advocate reviews it before you get it.",
    ],
    action: { label: "See how it works", to: "how" },
  },
  {
    id: "understand",
    question: "How do you understand my problem?",
    answer: () => [
      "Just write it the way you would tell a friend, in Hindi, English or a mix.",
      "Our AI picks out who was involved, what happened, the dates and the amounts. Every fact it records has to be an exact quote of your own words, so nothing gets twisted.",
      "Then it cross-questions you, usually 2 to 5 short questions about whatever is unclear or missing, like when you paid, what was agreed, or what you want to happen next.",
    ],
    action: { label: "Try it free", to: "notice" },
  },
  {
    id: "accuracy",
    question: "Will the AI make things up?",
    answer: () => [
      "That is exactly what our system is built to stop.",
      "The AI may only use facts you have confirmed. Every paragraph of the draft has to point to one of those facts. The legal sections it cites come only from a list our team has vetted, so it cannot invent a law or a case.",
      "A second AI check then compares the draft with your facts and sends it back if anything is unsupported. After that, an advocate reads it.",
    ],
  },
  {
    id: "documents",
    question: "Can it read my documents?",
    answer: () => [
      "Yes. Upload photos or PDFs: bank transfers, chat screenshots, agreements, receipts.",
      "The AI reads only what is visibly there and notes the exact text it relied on. It never guesses a blurry amount or a missing date.",
      "Your files stay private. There are no public links, and only you and the people working on your matter can open them.",
    ],
  },
  {
    id: "advocate",
    question: "Is a real advocate involved?",
    answer: () => [
      "Yes. We work with in-house advocates, and every legal notice and RTI application is reviewed by one of them before it reaches you.",
      "They check that the terms, the facts and the demand are clear and correct. They can edit the draft or ask you a question first.",
      "If our advocate cannot take your matter, you get a full refund.",
    ],
  },
  {
    id: "why-review",
    question: "Why check it by hand if the AI is good?",
    answer: () => [
      "Because a legal notice carries your name, and we care about getting it right.",
      "AI makes us fast and consistent. An advocate makes sure the situation is understood properly, the wording is right and nothing important is left out. We use both, and we would not ship one without the other.",
    ],
  },
  {
    id: "rti",
    question: "Is RTI done the same way?",
    answer: () => [
      "Yes, with the same care. Tell us what information you want, and our AI asks about the exact records, the time period and the office that holds them.",
      "It drafts the application under the RTI Act, 2005 to the right public authority, and our advocate reviews it too.",
      "You pay the government's RTI fee directly to the authority when you submit it.",
    ],
    action: { label: "Start an RTI application", to: "rti" },
  },
  {
    id: "scope",
    question: "What can you help me with?",
    answer: () => [
      "Legal notices for money owed, security deposits, unpaid salary or dues, broken agreements, faulty goods or services, and tenant or property disputes.",
      "And RTI applications to central and state public authorities.",
      "Not sure your problem fits? Describe it anyway. The free check tells you what we understood before you pay anything.",
    ],
    action: { label: "Check my case free", to: "notice" },
  },
  {
    id: "court",
    question: "Can you take my case further?",
    answer: () => [
      "Lawmedy prepares legal notices and RTI applications. Often a notice is enough to get things moving.",
      "If the other side does not reply, or your matter has to go further, our advocates can talk to you about the next steps.",
    ],
    action: { label: "Contact us", to: "contact" },
  },
  {
    id: "join",
    question: "I'm an advocate. Can I join?",
    answer: () => [
      "We would love that. Today our in-house advocates review every document, and our portal for independent advocates is almost ready.",
      "On the portal you will get requests with the facts and documents already organised, review AI-prepared drafts, and take matters further with clients who already trust you.",
      "Leave your name, phone and where you practise, and we will reach out when it opens.",
    ],
    action: { label: "Register as an advocate", to: "advocate" },
  },
  {
    id: "price",
    question: "How much does it cost, and how fast is it?",
    answer: ({ notice, rti }) => [
      `A legal notice is ${notice} and an RTI application is ${rti}, including the advocate review.`,
      "It is usually ready within 24 hours of verified payment. Checking your case is free, and you do not need an account to start.",
    ],
  },
  {
    id: "send",
    question: "Do you send the notice for me?",
    answer: () => [
      "You get a final PDF, reviewed by an advocate, that you can download and send yourself, by email, WhatsApp or registered post.",
      "Want to see what it looks like first? Have a look at a sample.",
    ],
    action: { label: "See a sample notice", to: "sample" },
  },
  {
    id: "privacy",
    question: "Is my information safe?",
    answer: () => [
      "Your account, statement and files are private. Uploads are never public and are only opened by the people working on your matter.",
      "AI is used only to prepare your document, and every AI step is logged on our side. You can delete your account and data from the app at any time.",
    ],
  },
];

export const greeting = [
  "Hi! I'm the Lawmedy assistant.",
  "Ask me how our AI drafts your legal notice or RTI application, and how our advocates check it. Pick a question below.",
];
