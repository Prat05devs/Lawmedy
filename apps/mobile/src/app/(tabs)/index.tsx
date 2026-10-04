import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { tap } from "@/components/app-ui";
import { HomeScreen } from "@/components/home-screen";
import { MatterList, NEEDS_YOU, NeedsYouCard, useMatters } from "@/components/matters";
import { Message } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { Matter, MatterType } from "@/lib/types";

// Signed-in home: the same main page everyone sees, with the person's matters on top.
export default function SignedInHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { matters, error } = useMatters();
  const [startError, setStartError] = useState("");
  const busy = React.useRef(false);

  async function start(type?: MatterType) {
    if (!type) return router.push("/new");
    if (busy.current) return;
    busy.current = true; setStartError("");
    try {
      const matter = await post<Matter>("/matters", { type });
      router.push({ pathname: "/matter/[id]", params: { id: matter.id } });
    } catch (e) { setStartError(errorMessage(e)); }
    finally { busy.current = false; }
  }

  const next = matters?.find((m) => NEEDS_YOU.includes(m.status));
  const recent = (matters ?? []).filter((m) => m.id !== next?.id).slice(0, 3);
  const top = (
    <View style={{ gap: 12 }}>
      <Text style={s.hello}>Hello, {user?.fullName.split(" ")[0]}</Text>
      <Message error={error || startError} />
      {next && <NeedsYouCard matter={next} />}
      {recent.length > 0 && (
        <>
          <View style={s.head}>
            <Text maxFontSizeMultiplier={1.3} style={s.title}>Your matters</Text>
            <Pressable onPress={() => { tap(); router.push("/matters"); }} hitSlop={10} accessibilityRole="button" style={s.all}>
              <Text style={s.allText}>See all</Text><Feather name="chevron-right" size={16} color={colors.ink} />
            </Pressable>
          </View>
          <MatterList matters={recent} />
        </>
      )}
    </View>
  );

  return <HomeScreen signedIn={{ name: user?.fullName ?? "", onStart: start, top }} />;
}

const s = StyleSheet.create({
  hello: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: colors.ink },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 4 },
  title: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: colors.ink },
  all: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32 },
  allText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
});
