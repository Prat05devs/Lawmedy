// Lawmedy design system: near-white surfaces, near-black ink, no colour accent. Headings in
// Space Grotesk, everything else in Inter. Key names are kept from the earlier theme so existing
// screens pick the new look up automatically.
export const colors = {
  navy: "#1c1b1a", // ink, used for primary surfaces and buttons
  navy2: "#464742",
  gold: "#1c1b1a", // former accent; the system is monochrome, so emphasis is ink
  gold2: "#32302f",
  ivory: "#fafafa",
  paper: "#fafafa", // surface, a neutral near-white
  card: "#ffffff", // surface-container-lowest
  ink: "#1c1b1a", // on-surface
  muted: "#5f5e5d", // on-surface-variant, for secondary text
  faint: "#777871", // outline, for tertiary text and inactive icons
  line: "#e5e5e3", // hairlines and card borders
  tint: "#f4f4f3", // inset boxes and pressed rows
  tint2: "#ededeb", // icon tiles and chips
  danger: "#ba1a1a",
  dangerBg: "#ffdad6",
  ok: "#2f6a47",
  okBg: "#eaf2ec",
  warnBg: "#f4ecd6",
  warnText: "#6b4d10",
};
export const fonts = {
  serif: "SpaceGrotesk_700Bold", // display and headings (name kept for existing screens)
  display: "SpaceGrotesk_700Bold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansBold: "Inter_600SemiBold",
};
// md is the card radius (12), sm is for inset boxes, chips and buttons (8).
export const radius = { sm: 8, md: 12, lg: 12 };
// Soft card shadow, the same on iOS and Android.
export const shadow = { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 } as const;
