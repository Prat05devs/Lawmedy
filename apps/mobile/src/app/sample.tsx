import React from "react";
import { useRouter } from "expo-router";
import { AppScreen, BarButton } from "@/components/app-ui";
import { SampleNotice } from "@/components/marketing";
import { Button } from "@/components/ui";

export default function Sample() {
  const router = useRouter();
  return (
    <AppScreen
      title="A sample notice"
      left={<BarButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      footer={<Button title="Start a legal notice" onPress={() => router.push({ pathname: "/start", params: { type: "LEGAL_NOTICE" } })} />}
    >
      <SampleNotice />
    </AppScreen>
  );
}
