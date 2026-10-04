import React, { useRef, useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { tap } from "@/components/app-ui";
import { courts } from "@/lib/courts";
import { setFlag } from "@/lib/device-flags";
import { colors, fonts } from "@/lib/theme";

const pages = [
  { photo: courts.supremeCourt, title: "Legal notices and RTI applications, from your phone", text: "Describe what happened. We prepare the document from the facts you confirm." },
  { photo: courts.bombayHighCourtStreet, title: "Write it your way", text: "Plain words are enough, in Hindi, English or a mix. You check every fact before anything is drafted." },
  { photo: courts.madrasHighCourt, title: "An advocate reviews every document", text: "You get a PDF you can send, usually within 24 hours of verified payment. Try it before you create an account." },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const finish = () => { setFlag("intro-seen"); router.replace("/"); };
  const next = () => {
    tap();
    if (page === pages.length - 1) return finish();
    // Update the counter ourselves: programmatic scrolls do not fire momentum events everywhere.
    setPage(page + 1);
    scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScrollEndDrag={onScroll}>
        {pages.map((p) => (
          <View key={p.title} style={{ width }}>
            <Image source={p.photo} style={[s.photo, { height: Math.round(height * 0.55) }]} contentFit="cover" />
            <View style={s.copy}>
              <Text style={s.title}>{p.title}</Text>
              <Text style={s.text}>{p.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <SafeAreaView edges={["top"]} style={s.skipWrap} pointerEvents="box-none">
        <Pressable onPress={finish} hitSlop={12} style={s.skip} accessibilityRole="button"><Text style={s.skipText}>Skip</Text></Pressable>
      </SafeAreaView>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.dots}>{pages.map((p, i) => <View key={p.title} style={[s.dot, i === page && s.dotOn]} />)}</View>
        <Button title={page === pages.length - 1 ? "Get started" : "Next"} onPress={next} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  photo: { width: "100%", backgroundColor: colors.tint },
  copy: { paddingHorizontal: 24, paddingTop: 28 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink, marginBottom: 12 },
  text: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, color: colors.muted },
  skipWrap: { position: "absolute", top: 0, right: 0, left: 0, alignItems: "flex-end" },
  skip: { margin: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(246,242,234,0.92)" },
  skipText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 16 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.ink, width: 22 },
});
