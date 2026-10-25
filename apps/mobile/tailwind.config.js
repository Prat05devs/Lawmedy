const { hairlineWidth } = require("nativewind/theme");

const pair = (name) => ({ DEFAULT: `hsl(var(--${name}))`, foreground: `hsl(var(--${name}-foreground))` });

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind's web stylesheet observer synchronizes the root theme class.
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: pair("primary"),
        secondary: pair("secondary"),
        destructive: pair("destructive"),
        muted: pair("muted"),
        accent: pair("accent"),
        popover: pair("popover"),
        card: pair("card"),
        robe: "hsl(var(--primary))",
        mor: { DEFAULT: "hsl(var(--mor))", tint: "hsl(var(--mor-tint))", ink: "hsl(var(--mor-ink))" },
        genda: { DEFAULT: "hsl(var(--genda))", tint: "hsl(var(--genda-tint))", ink: "hsl(var(--genda-ink))" },
        rani: { DEFAULT: "hsl(var(--rani))", tint: "hsl(var(--rani-tint))", ink: "hsl(var(--rani-ink))" },
      },
      // React Native has one family per weight, so weights are separate families.
      fontFamily: {
        sans: ["ZalandoSans_400Regular"],
        "sans-medium": ["ZalandoSans_500Medium"],
        "sans-bold": ["ZalandoSans_600SemiBold"],
        display: ["ZalandoSansExpanded_800ExtraBold"],
        "display-bold": ["ZalandoSansExpanded_700Bold"],
        "display-regular": ["ZalandoSansExpanded_400Regular"],
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [require("tailwindcss-animate")],
};
