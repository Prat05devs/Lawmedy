import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { tap } from "@/components/app-ui";
import { colors, fonts, radius, shadow } from "@/lib/theme";

type Kind = "LEGAL_NOTICE" | "RTI";
const serif = Platform.select({ ios: "Georgia", default: "serif" });

const Bar = ({ w, dark }: { w: `${number}%`; dark?: boolean }) => <View style={[s.bar, { width: w }, dark && { backgroundColor: "#b9b5b2" }]} />;

// A miniature of the document the person will receive, drawn in code: a legal notice with an
// advocate's review stamp, or an RTI application under Section 6(1). It shows what they are choosing.
export function DocPreview({ kind }: { kind: Kind }) {
  const notice = kind === "LEGAL_NOTICE";
  return (
    <View style={s.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[s.paper, s.back, notice ? { transform: [{ rotate: "4deg" }] } : { transform: [{ rotate: "-4deg" }] }]} />
      <View style={[s.paper, { transform: [{ rotate: notice ? "-2deg" : "2deg" }] }]}>
        <View style={s.head}>
          <Text style={s.brand}>LAWMEDY</Text>
          <Text style={s.kind}>{notice ? "LEGAL NOTICE" : "RTI APPLICATION"}</Text>
        </View>
        <View style={s.rule} />
        {notice ? (
          <>
            <Text style={s.line}><Text style={s.b}>To:</Text> Rakesh Kumar, Dehradun</Text>
            <Text style={s.line}><Text style={s.b}>Subject:</Text> Repayment of ₹2,00,000</Text>
            <View style={s.para}><Text style={s.num}>1.</Text><View style={{ flex: 1, gap: 3 }}><Bar w="100%" /><Bar w="82%" /></View></View>
            <View style={s.para}><Text style={s.num}>2.</Text><View style={{ flex: 1, gap: 3 }}><Bar w="94%" /><Bar w="60%" /></View></View>
            <View style={s.para}><Text style={s.num}>3.</Text><View style={{ flex: 1, gap: 3 }}><Bar w="88%" dark /><Bar w="70%" dark /></View></View>
          </>
        ) : (
          <>
            <Text style={s.line}><Text style={s.b}>To:</Text> The Public Information Officer</Text>
            <Text style={s.line}><Text style={s.b}>Under:</Text> Section 6(1), RTI Act, 2005</Text>
            <Text style={[s.line, s.b, { marginTop: 3 }]}>Information sought</Text>
            <View style={s.para}><Text style={s.num}>1.</Text><View style={{ flex: 1, gap: 3 }}><Bar w="96%" /><Bar w="58%" /></View></View>
            <View style={s.para}><Text style={s.num}>2.</Text><View style={{ flex: 1, gap: 3 }}><Bar w="86%" /><Bar w="44%" /></View></View>
            <Text style={[s.line, { marginTop: 3 }]}><Text style={s.b}>Period:</Text> April 2024 to March 2025</Text>
          </>
        )}
      </View>
      <View style={[s.stamp, notice ? { transform: [{ rotate: "-12deg" }] } : { transform: [{ rotate: "-8deg" }] }]}>
        <Feather name={notice ? "check" : "clock"} size={13} color={colors.ink} />
        <Text style={s.stampText}>{notice ? "ADVOCATE\nREVIEWED" : "REPLY IN\n30 DAYS"}</Text>
      </View>
    </View>
  );
}

// The whole card is the button, like PhotoCard, with the document preview in place of a photo.
export function DocCard({ kind, title, text, onPress }: { kind: Kind; title: string; text?: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <DocPreview kind={kind} />
      <View style={s.body}>
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
          {text ? <Text style={s.text}>{text}</Text> : null}
        </View>
        <Feather name="arrow-right" size={20} color={colors.ink} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: "hidden", ...shadow },
  stage: { aspectRatio: 16 / 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  paper: { width: "62%", aspectRatio: 0.92, backgroundColor: "#fffdf9", borderRadius: 3, paddingHorizontal: 12, paddingTop: 10, gap: 4, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4, marginTop: "18%" },
  back: { position: "absolute", backgroundColor: "#f1eeea", top: undefined },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontFamily: serif, fontSize: 7, letterSpacing: 1, color: colors.ink },
  kind: { fontFamily: fonts.sansBold, fontSize: 7, letterSpacing: 0.8, color: colors.accent },
  rule: { height: 1, backgroundColor: colors.ink, marginBottom: 2 },
  line: { fontFamily: serif, fontSize: 7.5, color: "#2b2927" },
  b: { fontWeight: "700" },
  para: { flexDirection: "row", gap: 4, marginTop: 3 },
  num: { fontFamily: serif, fontSize: 7, color: "#2b2927", width: 8 },
  bar: { height: 3.5, borderRadius: 2, backgroundColor: "#dcd8d4" },
  stamp: { position: "absolute", right: "13%", bottom: "12%", width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.ink, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center", gap: 1 },
  stampText: { fontFamily: fonts.sansBold, fontSize: 7, lineHeight: 8, letterSpacing: 0.4, textAlign: "center", color: colors.ink },
  body: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: colors.ink },
  text: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 3 },
});
