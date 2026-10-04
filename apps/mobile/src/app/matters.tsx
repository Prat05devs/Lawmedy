import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen, BarButton } from "@/components/app-ui";
import { MatterList, useMatters } from "@/components/matters";
import { Body, Button, Loading, Message } from "@/components/ui";

// Every matter the signed-in person has started, newest first.
export default function AllMatters() {
  const router = useRouter();
  const { matters, error } = useMatters();
  return (
    <AppScreen title="My matters" left={<BarButton icon="chevron-left" label="Back" onPress={() => router.back()} />}>
      <Message error={error} />
      {!matters && !error ? <Loading /> : null}
      {matters && matters.length === 0 && (
        <View style={{ gap: 14 }}>
          <Body muted>Nothing here yet. Start a legal notice or an RTI application from the New tab.</Body>
          <Button title="Start something new" icon="plus" onPress={() => router.push("/new")} />
        </View>
      )}
      {matters && matters.length > 0 && <MatterList matters={matters} />}
    </AppScreen>
  );
}
