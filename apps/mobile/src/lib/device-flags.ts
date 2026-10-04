import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";

// Small on-device markers (for example, "the intro has been seen"). Nothing personal.
// Phones use the app's private files; the web build uses localStorage.
const file = (name: string) => new File(Paths.document, `flag-${name}`);
export function hasFlag(name: string) {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(`flag-${name}`) === "1";
    return file(name).exists;
  } catch { return false; }
}
export function setFlag(name: string) {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(`flag-${name}`, "1");
    const f = file(name); if (!f.exists) f.create();
  } catch { /* best effort */ }
}
