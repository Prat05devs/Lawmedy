import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen } from "@/components/app-ui";
import { DocCard } from "@/components/doc-card";
import { Body, Message } from "@/components/ui";
import { post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import type { Matter, MatterType } from "@/lib/types";

export default function NewMatter() {
  const router = useRouter();
  const [busy, setBusy] = useState<MatterType | null>(null);
  const [error, setError] = useState("");

  async function start(type: MatterType) {
    if (busy) return;
    setBusy(type); setError("");
    try {
      const matter = await post<Matter>("/matters", { type });
      router.push({ pathname: "/matter/[id]", params: { id: matter.id } });
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <AppScreen title="Start something new">
      <Body muted style={{ marginBottom: 18 }}>An advocate reviews every document before you receive it.</Body>
      <Message error={error} />
      <View style={{ gap: 14, opacity: busy ? 0.6 : 1 }}>
        <DocCard kind="LEGAL_NOTICE" title="Legal notice" text="Money owed, a deposit or refund, a broken agreement, a consumer or property dispute." onPress={() => start("LEGAL_NOTICE")} />
        <DocCard kind="RTI" title="RTI application" text="Records and decisions from a public authority." onPress={() => start("RTI")} />
      </View>
    </AppScreen>
  );
}
