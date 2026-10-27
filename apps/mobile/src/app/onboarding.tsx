import React, { useRef, useState } from "react";
import { Dimensions, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { tap } from "@/components/app-ui";
import { band } from "@/lib/app-theme";
import { setFlag } from "@/lib/device-flags";
import { photos } from "@/lib/photos";
import { fonts } from "@/lib/theme";

// Full-screen photos under the same black fade as the home page, the same in day and night.
const pages = [
  { photo: photos.advocateDesk, title: "Legal notices, RTI applications and lending certificates, from your phone", text: "Describe what happened. We prepare the document from the facts you confirm." },
  { photo: photos.neighbourhoodDispute, title: "Write it your way", text: "Plain words are enough, in Hindi, English or a mix. You check every fact before anything is drafted." },
  { photo: photos.street, title: "An advocate reviews every document", text: "No leave, no queue. You get a PDF you can send, usually within 24 hours of verified payment." },
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
    <View style={{ flex: 1, backgroundColor: "#0b0c0c" }}>
      <StatusBar style="light" />
      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScrollEndDrag={onScroll}>
        {pages.map((p) => (
          <ImageBackground key={p.title} source={p.photo} resizeMode="cover" style={{ width, height }}>
            <LinearGradient colors={["rgba(8,9,9,0.35)", "rgba(8,9,9,0.55)", "rgba(8,9,9,0.97)"]} locations={[0, 0.4, 0.78]} style={StyleSheet.absoluteFill} />
            <View style={[s.copy, { paddingBottom: Math.max(insets.bottom, 16) + 132 }]}>
              <Text maxFontSizeMultiplier={1.3} style={s.title}>{p.title}</Text>
              <Text style={s.text}>{p.text}</Text>
            </View>
          </ImageBackground>
        ))}
      </ScrollView>
      <SafeAreaView edges={["top"]} style={s.skipWrap} pointerEvents="box-none">
        <Pressable onPress={finish} hitSlop={12} style={s.skip} accessibilityRole="button"><Text style={s.skipText}>Skip</Text></Pressable>
      </SafeAreaView>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.dots}>{pages.map((p, i) => <View key={p.title} style={[s.dot, i === page && s.dotOn]} />)}</View>
        <Pressable onPress={next} accessibilityRole="button" style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          <Text style={s.btnText}>{page === pages.length - 1 ? "Get started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  copy: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 24 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.9, color: band.ink, marginBottom: 12 },
  text: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, color: band.muted },
  skipWrap: { position: "absolute", top: 0, right: 0, left: 0, alignItems: "flex-end" },
  skip: { margin: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: band.line, backgroundColor: band.glass },
  skipText: { fontFamily: fonts.sansBold, fontSize: 15, color: band.ink },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, gap: 16 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: band.line },
  dotOn: { backgroundColor: band.ink, width: 22 },
  btn: { minHeight: 54, borderRadius: 14, backgroundColor: band.accent, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.sansBold, fontSize: 16.5, color: band.accentInk },
});
