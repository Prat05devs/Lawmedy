import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Message, PanelHeader } from "@/components/ui";
import { API_URL, authHeaders, post } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { FinalDocument, MatterType } from "@/lib/types";

export function FinalPanel({ matterId, doc, type, step, onChanged }: { matterId: string; doc: FinalDocument; type: MatterType; step: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (doc.state === "NOT_READY") return null;
  const name = type === "RTI" ? "RTI application" : "Legal notice";

  async function download(d: Extract<FinalDocument, { state: "READY" }>) {
    setBusy(true); setError("");
    try {
      const query = d.downloadUrl.includes("?") ? d.downloadUrl.slice(d.downloadUrl.indexOf("?")) : "";
      const target = new File(Paths.cache, `lawmedy-${type === "RTI" ? "rti" : "legal-notice"}.pdf`);
      if (target.exists) target.delete();
      const file = await File.downloadFileAsync(`${API_URL}/matters/${matterId}/final-document/file${query}`, target, { headers: authHeaders() });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `Your ${name}` });
      else setError("Sharing is not available on this device.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function retry() {
    setBusy(true); setError("");
    try { await post(`/matters/${matterId}/final-document/retry`, undefined, 70000); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <Card>
      <PanelHeader step={step} title={`Your ${name} is ready`} subtitle="Private to you and available only after sign-in." />
      {doc.state === "READY" ? (
        <>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <Ionicons name="document-attach-outline" size={34} color={colors.ok} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink }}>{doc.filename || "Final PDF"}</Text>
              <Body muted small>{Math.max(1, Math.ceil(doc.sizeBytes / 1024))} KB</Body>
            </View>
          </View>
          <Button title={Platform.OS === "ios" ? "Open / share PDF" : "Download PDF"} icon="download-outline" variant="gold" onPress={() => download(doc)} loading={busy} />
        </>
      ) : (
        <>
          <Body muted>Your approved draft is safe. The final PDF is still being prepared.</Body>
          <Button variant="outline" title="Prepare final PDF" icon="refresh" onPress={retry} loading={busy} style={{ marginTop: 12 }} />
        </>
      )}
      <Message error={error} />
    </Card>
  );
}
