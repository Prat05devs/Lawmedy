import { File, Paths } from "expo-file-system";

// Small on-device markers (for example, "the intro has been seen"). Nothing personal.
const file = (name: string) => new File(Paths.document, `flag-${name}`);
export function hasFlag(name: string) {
  try { return file(name).exists; } catch { return false; }
}
export function setFlag(name: string) {
  try { const f = file(name); if (!f.exists) f.create(); } catch { /* best effort */ }
}
