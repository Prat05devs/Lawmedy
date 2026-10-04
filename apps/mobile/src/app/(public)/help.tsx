import React from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen, BarButton, Group, GroupLabel, ListRow } from "@/components/app-ui";
import { Faq } from "@/components/marketing";
import { Body } from "@/components/ui";
import { WEB_URL } from "@/lib/links";

const faqs = [
  { q: "Is this legal advice?", a: "No. Lawmedy prepares documents and an advocate reviews each one. For a large or complicated dispute, speak to an advocate before you send anything." },
  { q: "Do I need documents to start?", a: "No. You can begin with your own account. Documents make the draft more exact." },
  { q: "Do you send it for me?", a: "No. You get a PDF and you send it. For an RTI application, you pay the government fee directly to the authority." },
  { q: "How long does it take?", a: "Usually within 24 hours of verified payment. Payment is verified by hand." },
  { q: "What if you cannot take my matter?", a: "If our advocate declines a matter, you get a full refund." },
  { q: "Can I delete my data?", a: "Yes. After you create an account, open Account and choose Delete my account." },
];

export default function Help() {
  const router = useRouter();
  const open = (path: string) => Linking.openURL(`${WEB_URL}${path}`);
  return (
    <AppScreen title="Help" right={<BarButton label="Log in" onPress={() => router.push("/login")} />}>
      <Group>
        <ListRow icon="list" title="How it works" onPress={() => router.push("/how-it-works")} />
        <ListRow icon="file-text" title="See a sample notice" onPress={() => router.push("/sample")} last />
      </Group>
      <GroupLabel>Questions</GroupLabel>
      <Faq items={faqs} />
      <GroupLabel>Contact and policies</GroupLabel>
      <Group>
        <ListRow icon="message-circle" title="Contact and support" onPress={() => open("/contact")} />
        <ListRow icon="shield" title="Privacy policy" onPress={() => open("/privacy")} />
        <ListRow icon="book-open" title="Terms of use" onPress={() => open("/terms")} />
        <ListRow icon="credit-card" title="Refund policy" onPress={() => open("/refunds")} />
        <ListRow icon="image" title="Photo credits" onPress={() => router.push("/credits")} last />
      </Group>
      <GroupLabel>Are you an advocate?</GroupLabel>
      <Body muted>Today our in-house advocate reviews every document. We are working on a way for more advocates to join. Write to us to hear when it opens.</Body>
    </AppScreen>
  );
}
