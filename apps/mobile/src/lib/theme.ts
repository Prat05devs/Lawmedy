// Lawmedy brand kit: Zalando Sans Expanded for headings, Zalando Sans for everything else, on a
// near-white background with a warm grey palette and Feather icons. Key names are kept from the
// earlier theme so existing screens pick the look up automatically.
export const colors = {
  navy: "#171615", // ink, used for primary surfaces and buttons
  navy2: "#413f3e",
  gold: "#171615", // former accent; the system is monochrome, so emphasis is ink
  gold2: "#413f3e",
  ivory: "#fafafa",
  paper: "#fafafa", // background
  card: "#ffffff", // surface
  ink: "#171615", // text
  primary: "#d6d3d1", // brand primary: chips, tiles, selected states
  accent: "#413f3e", // brand accent: secondary dark surfaces
  muted: "#5f5d5b", // secondary text
  faint: "#8a8785", // tertiary text and inactive icons
  line: "#dadada", // border
  tint: "#f4f4f3", // inset boxes and pressed rows
  tint2: "#ebe9e8", // icon tiles and chips (a light step of primary)
  danger: "#ba1a1a",
  dangerBg: "#ffdad6",
  ok: "#2f6a47",
  okBg: "#eaf2ec",
  warnBg: "#f4ecd6",
  warnText: "#6b4d10",
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
