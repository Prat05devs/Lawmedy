import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen } from "@/components/app-ui";
import { DocCard } from "@/components/doc-card";
import { Body, Message } from "@/components/ui";
import { post } from "@/lib/api";
import { usePublic, type Pricing } from "@/lib/public";
import { errorMessage } from "@/lib/hooks";
import { services, servicePrice } from "@/lib/services";
import type { Matter, MatterType } from "@/lib/types";

export default function NewMatter() {
  const router = useRouter();
  const pricing = usePublic<Pricing | null>("/public/pricing", null);
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
        {services.map((service) => <DocCard key={service.type} kind={service.type} title={`${service.title} · ${servicePrice(pricing, service.type)}`} text={service.text} disabled={!!busy} onPress={() => start(service.type)} />)}
      </View>
    </AppScreen>
  );
}
