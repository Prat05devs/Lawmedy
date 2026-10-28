// Lawmedy brand kit: Zalando Sans Expanded for headings, Zalando Sans for everything else, on a
// near-white background with a warm grey palette and Feather icons. Key names are kept from the
// earlier theme so existing screens pick the look up automatically.
export const colors: Record<ColorKey, string> = {
  navy: "#141414", // robe black: primary surfaces and buttons
  navy2: "#413f3e",
  gold: "#171615", // former accent; the system is monochrome, so emphasis is ink
  gold2: "#413f3e",
  ivory: "#fafafa",
  paper: "#f8f8f6", // background (band white)
  card: "#ffffff", // surface
  ink: "#141414", // text
  primary: "#d6d3d1", // brand primary: chips, tiles, selected states
  accent: "#413f3e", // brand accent: secondary dark surfaces
  muted: "#55554f", // secondary text
  faint: "#8a8785", // tertiary text and inactive icons
  line: "#e3e3df", // border
  tint: "#f4f4f3", // inset boxes and pressed rows
  tint2: "#ebe9e8", // icon tiles and chips (a light step of primary)
  danger: "#ba1a1a",
  dangerBg: "#ffdad6",
  ok: "#2f6a47",
  okBg: "#eaf2ec",
  warnBg: "#f4ecd6",
  warnText: "#6b4d10",
  // "Mor & Genda" accents, the same as the website. Mor (peacock) = work and home,
  // Genda (marigold) = money and the highlight on dark surfaces, Rani (pink) = shopping, in small doses.
  mor: "#0b6e69",
  morTint: "#e0f2ef",
  morInk: "#08524e",
  genda: "#f2a900",
  gendaTint: "#fdf0cc",
  gendaInk: "#6b4800",
  rani: "#c2185b",
  raniTint: "#fbe3ec",
  // A solid block that carries white text or icons: the chat button, your chat bubbles, "Needs you".
  solid: "#0b6e69",
  raniInk: "#8e1043",
};
export const fonts = {
  serif: "ZalandoSansExpanded_800ExtraBold", // headings (name kept for existing screens)
  display: "ZalandoSansExpanded_800ExtraBold", // display, H1, H2
  displayBold: "ZalandoSansExpanded_700Bold", // small headings, where 800 gets too dense
  displayRegular: "ZalandoSansExpanded_400Regular", // H3, quotes
  sans: "ZalandoSans_400Regular",
  sansMedium: "ZalandoSans_500Medium",
  sansBold: "ZalandoSans_600SemiBold",
};
// md is the card radius (12), sm is for inset boxes, chips and buttons (8).
export const radius = { sm: 8, md: 12, lg: 12 };
// Soft card shadow, the same on iOS and Android.
export const shadow = { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 } as const;

type ColorKey =
  | "navy" | "navy2" | "gold" | "gold2" | "ivory" | "paper" | "card" | "ink" | "primary" | "accent" | "muted" | "faint" | "line"
  | "tint" | "tint2" | "danger" | "dangerBg" | "ok" | "okBg" | "warnBg" | "warnText" | "mor" | "morTint" | "morInk"
  | "genda" | "gendaTint" | "gendaInk" | "rani" | "raniTint" | "raniInk" | "solid";

// Night mode, the same palette as the website: soft black surfaces, light text, the lifted Mor accent.
const day = { ...colors };
const night: Record<ColorKey, string> = {
  navy: "#eceeed", navy2: "#c9cecc", gold: "#eceeed", gold2: "#c9cecc", ivory: "#101312", paper: "#101312", card: "#171b1a",
  ink: "#eceeed", primary: "#2a302e", accent: "#c9cecc", muted: "#a3a9a7", faint: "#7d8482", line: "#2a302e",
  tint: "#1d2221", tint2: "#232928", danger: "#ff8a80", dangerBg: "#3a1a18", ok: "#4caf7d", okBg: "#16261d",
  warnBg: "#2c2512", warnText: "#e8c46a", mor: "#4fbfb3", morTint: "rgba(79,191,179,0.14)", morInk: "#7ad3c9",
  genda: "#f2a900", gendaTint: "#2c2512", gendaInk: "#e8c46a", rani: "#e8508a", raniTint: "#2e1620", raniInk: "#f08cb0",
  solid: "#1f7a73",
};

// `colors` is read while rendering, so switching mode swaps its values and the app re-renders.
let current: "day" | "night" = "day";
export function setColorMode(mode: "day" | "night") {
  current = mode;
  Object.assign(colors, mode === "night" ? night : day);
}

// Style sheets that follow the mode: built for the current mode the first time each is read.
export function themed<T extends object>(build: () => T): T {
  const cache: Partial<Record<"day" | "night", T>> = {};
  return new Proxy({} as T, {
    get: (_target, key) => (cache[current] ??= build())[key as keyof T],
  });
}
export const isNight = () => current === "night";
