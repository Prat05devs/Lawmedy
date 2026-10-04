import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Body, Button, Card, Message, PanelHeader } from "@/components/ui";
import { post, uploadFile } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import { colors, fonts } from "@/lib/theme";
import type { EvidenceItem } from "@/lib/types";

const MAX = 10 * 1024 * 1024;

export function EvidencePanel({ matterId, items, editable, step, onChanged }: { matterId: string; items: EvidenceItem[]; editable: boolean; step: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(file: { uri: string; name: string; type: string; size?: number }) {
    if (file.size && file.size > MAX) return setError("That file is larger than 10 MB.");
    setBusy(true); setError("");
    try { await uploadFile(`/matters/${matterId}/evidence`, file); onChanged(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function pickFile() {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (r.canceled) return;
    const f = r.assets[0];
    await send({ uri: f.uri, name: f.name, type: f.mimeType || "application/pdf", size: f.size });
  }
  async function pickPhoto(camera: boolean) {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Please allow access in Settings to attach a photo.");
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8 };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return;
    const a = r.assets[0];
    await send({ uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, type: a.mimeType || "image/jpeg", size: a.fileSize });
  }
  async function retry(id: string) {
    try { await post(`/matters/${matterId}/evidence/${id}/retry`); onChanged(); } catch (e) { setError(errorMessage(e)); }
  }

  return (
    <Card>
      <PanelHeader step={step} title="Your documents" subtitle="Optional. Agreements, receipts, transfers, screenshots." />
      {items.map((e) => (
        <View key={e.id} style={{ flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, alignItems: "flex-start" }}>
          <Feather name={e.mimeType === "application/pdf" ? "file-text" : "image"} size={22} color={colors.navy2} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>{e.originalFilename}</Text>
            <Body muted small>
              {e.status === "PROCESSING" ? "Reading this document…" : e.status === "PROCESSED" ? e.extraction?.extraction.summary || "Read successfully" : e.statusMessage || "We could not read this file"}
            </Body>
            {e.status === "FAILED" && editable && <Text onPress={() => retry(e.id)} style={{ fontFamily: fonts.sansMedium, color: colors.navy2, marginTop: 4, textDecorationLine: "underline" }}>Try again</Text>}
          </View>
        </View>
      ))}
      <Message error={error} />
      {editable && (
        <View style={{ gap: 10, marginTop: 12 }}>
          <Button variant="outline" title="Choose a PDF or image" icon="paperclip" onPress={pickFile} loading={busy} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button variant="outline" title="Camera" icon="camera" onPress={() => pickPhoto(true)} disabled={busy} style={{ flex: 1 }} />
            <Button variant="outline" title="Photos" icon="image" onPress={() => pickPhoto(false)} disabled={busy} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Card>
  );
}
