import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { AppScreen, BarButton, Group, GroupLabel, ListRow, PhotoCard } from "@/components/app-ui";
import { courts } from "@/lib/courts";
import { money } from "@/lib/hooks";
import { usePublic, type Pricing, type Testimonial } from "@/lib/public";
import { colors, fonts, radius } from "@/lib/theme";

export default function Home() {
  const router = useRouter();
  const pricing = usePublic<Pricing | null>("/public/pricing", null);
  const testimonials = usePublic<Testimonial[]>("/public/testimonials", []);
  const price = pricing ? money(pricing.legalNotice, pricing.currency) : "₹299";

  return (
    <AppScreen
      left={<Image source={require("../../../assets/logo-dark.png")} style={{ width: 112, height: 30 }} contentFit="contain" contentPosition="left" />}
      right={<BarButton label="Log in" onPress={() => router.push("/login")} />}
    >
      <Text style={s.title}>What do you need to put in writing?</Text>
      <View style={{ gap: 14 }}>
        <PhotoCard photo={courts.bombayHighCourtStreet} title="Send a legal notice" text="Money owed, a deposit or refund, a broken agreement, a consumer or property dispute." onPress={() => router.push({ pathname: "/start", params: { type: "LEGAL_NOTICE" } })} />
        <PhotoCard photo={courts.supremeCourtWide} title="File an RTI application" text="Ask a public authority for records and decisions." onPress={() => router.push({ pathname: "/start", params: { type: "RTI" } })} />
      </View>

      <View style={s.priceStrip}>
        <Text style={s.priceText}>{price} per document · usually ready within 24 hours of verified payment · no account needed to start</Text>
      </View>

      <GroupLabel>Before you start</GroupLabel>
      <Group>
        <ListRow icon="search-outline" title="Check your case for free" text="See what we understood and what we would need" onPress={() => router.push("/start")} />
        <ListRow icon="document-text-outline" title="See a sample notice" text="What the final PDF looks like" onPress={() => router.push("/sample")} />
        <ListRow icon="list-outline" title="How it works" text="Five steps, from your words to a reviewed PDF" onPress={() => router.push("/how-it-works")} last />
      </Group>

      {testimonials.length > 0 && (
        <>
          <GroupLabel>What customers say</GroupLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
            {testimonials.map((t) => (
              <View key={t.id} style={s.quote}>
                <Text style={s.quoteText}>{t.quote}</Text>
                <Text style={s.quoteBy}>{t.name}{t.descriptor ? `, ${t.descriptor}` : ""}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <GroupLabel>Reviewed by an advocate</GroupLabel>
      <View style={s.feature}>
        <Image source={courts.uttarakhandHighCourt} style={s.featurePhoto} contentFit="cover" />
        <Text style={s.featureText}>Every legal notice and RTI application is checked by our in-house advocate before you receive it. They may edit it or ask you a question first.</Text>
      </View>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: colors.ink, marginBottom: 18, marginTop: 6 },
  priceStrip: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.tint },
  priceText: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: colors.ink },
  quote: { width: 280, padding: 16, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  quoteText: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 25, color: colors.ink, marginBottom: 10 },
  quoteBy: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  feature: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  featurePhoto: { width: "100%", aspectRatio: 16 / 9 },
  featureText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink, padding: 16 },
});
