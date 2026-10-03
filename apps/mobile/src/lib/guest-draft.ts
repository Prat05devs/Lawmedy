import { File, Paths } from "expo-file-system";
import type { MatterType } from "./types";

// What a visitor typed before they had an account. It lives only on this device, in the app's
// private storage, until they register or log in; then it is turned into a real matter.
export type GuestDraft = {
  type: MatterType;
  statement: string;
  authorityId?: string;
  subject?: string;
  savedAt: string;
};

const file = () => new File(Paths.document, "guest-draft.json");

export async function loadDraft(): Promise<GuestDraft | null> {
  try {
    const f = file();
    if (!f.exists) return null;
    const draft = JSON.parse(await f.text()) as GuestDraft;
    return draft?.statement?.trim() ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<GuestDraft, "savedAt">) {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    // Saving is a convenience; the screen still works without it.
  }
}

export function clearDraft() {
  try {
    const f = file();
    if (f.exists) f.delete();
  } catch {
    // Nothing to clear.
  }
}
