import React from "react";
import { Linking, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen, BarButton } from "@/components/app-ui";
import { Body } from "@/components/ui";
import { courtNames, photoCredits } from "@/lib/courts";
import { colors, fonts } from "@/lib/theme";

export default function Credits() {
  const router = useRouter();
  return (
    <AppScreen title="Photo credits" left={<BarButton icon="chevron-back" label="Back" onPress={() => router.back()} />}>
      <Body muted style={{ marginBottom: 12 }}>Photographs of Indian courts from Wikimedia Commons, used under their licences. They were resized and cropped for display.</Body>
      {photoCredits.map((c) => (
        <View key={c.file} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink }}>{courtNames[c.file] ?? c.title}</Text>
          <Body muted small>Photo by {c.author}, {c.license}</Body>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, textDecorationLine: "underline", marginTop: 4 }} onPress={() => Linking.openURL(c.source)}>Source</Text>
          {c.licenseUrl ? <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, textDecorationLine: "underline", marginTop: 4 }} onPress={() => Linking.openURL(c.licenseUrl)}>Licence</Text> : null}
        </View>
      ))}
    </AppScreen>
  );
}
