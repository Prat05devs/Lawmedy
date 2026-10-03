import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Button, H1, Message, Screen } from "@/components/ui";
import { api, post, publicApi } from "@/lib/api";
import { clearDraft, loadDraft } from "@/lib/guest-draft";
import { errorMessage } from "@/lib/hooks";
import type { PublicAuthority } from "@/lib/public";
import type { Matter } from "@/lib/types";
import { colors } from "@/lib/theme";

// Runs once after someone who started as a guest signs up or logs in: turns what they typed
// into a real matter on their account, then opens it.
export default function Resume() {
  const router = useRouter();
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setError("");
    const draft = await loadDraft();
    if (!draft) return router.replace("/");
    try {
      const matter = await post<Matter>("/matters", { type: draft.type });
      // Saving the statement also starts the analysis, which can take up to a minute.
      await post(`/matters/${matter.id}/statement`, { statement: draft.statement }, 90000);
      if (draft.type === "RTI" && draft.authorityId) {
        const authority = (await publicApi<PublicAuthority[]>("/public/rti-authorities")).find((a) => a.id === draft.authorityId);
        if (authority)
          await api(`/matters/${matter.id}/rti-details`, {
            method: "POST",
            body: JSON.stringify({
              governmentLevel: authority.governmentLevel,
              state: authority.state || undefined,
              department: authority.department,
              publicAuthorityId: authority.id,
              subject: (draft.subject || draft.statement).trim().slice(0, 300),
            }),
          }).catch(() => undefined);
      }
      clearDraft();
      router.replace({ pathname: "/matter/[id]", params: { id: matter.id } });
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [router]);

  useEffect(() => { void run(); }, [run]);

  return (
    <Screen>
      <H1>Saving what you wrote</H1>
      {error ? (
        <View style={{ gap: 14 }}>
          <Message error={error} />
          <Body muted>Your text is still saved on this phone. Try again, or go to your matters.</Body>
          <Button title="Try again" onPress={run} />
          <Button title="Go to my matters" variant="outline" onPress={() => router.replace("/")} />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <ActivityIndicator color={colors.ink} />
          <Body muted>Creating your matter and reading your statement. This can take up to a minute.</Body>
        </View>
      )}
    </Screen>
  );
}
