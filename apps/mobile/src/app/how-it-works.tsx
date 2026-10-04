import React from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { AppScreen, BarButton } from "@/components/app-ui";
import { Steps } from "@/components/marketing";
import { Body } from "@/components/ui";
import { courts } from "@/lib/courts";
import { radius } from "@/lib/theme";

const steps = [
  { title: "You describe the problem", text: "A few plain sentences are enough, in Hindi, English or a mix. We ask only for what is missing." },
  { title: "You add what you already have", text: "Agreements, receipts, bank transfers, screenshots. Photos or PDFs, up to 10 MB each." },
  { title: "You confirm every fact", text: "Each date and amount is shown next to where it came from. If two sources disagree, you choose." },
  { title: "You pay and send the reference", text: "We check the payment by hand, and your matter shows “Payment verified”." },
  { title: "We draft, an advocate reviews, you download", text: "The PDF is usually ready within 24 hours of verified payment. You send it yourself." },
];

export default function HowItWorks() {
  const router = useRouter();
  return (
    <AppScreen title="How it works" left={<BarButton icon="chevron-left" label="Back" onPress={() => router.back()} />}>
      <Image source={courts.calcuttaHighCourt} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: radius.md, marginBottom: 18 }} contentFit="cover" />
      <Steps items={steps} />
      <Body muted small style={{ marginTop: 16 }}>Lawmedy prepares documents. It is not a substitute for legal advice on complex disputes.</Body>
    </AppScreen>
  );
}
