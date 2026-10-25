import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./design.css";
import "./refine.css";

// Brand kit: Zalando Sans Expanded for headings (kept on the --font-serif variable the CSS already uses),
// Zalando Sans for everything else.
const serif = localFont({ src: [
  { path: "./fonts/ZalandoSansExpanded_400Regular.ttf", weight: "400" },
  { path: "./fonts/ZalandoSansExpanded_700Bold.ttf", weight: "700" },
  { path: "./fonts/ZalandoSansExpanded_800ExtraBold.ttf", weight: "800" },
], variable: "--font-serif", display: "swap" });
const sans = localFont({ src: [
  { path: "./fonts/ZalandoSans_400Regular.ttf", weight: "400" },
  { path: "./fonts/ZalandoSans_500Medium.ttf", weight: "500" },
  { path: "./fonts/ZalandoSans_600SemiBold.ttf", weight: "600" },
  { path: "./fonts/ZalandoSans_700Bold.ttf", weight: "700" },
], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Lawmedy — Legal notices, RTI & lending certificates",
    template: "%s | Lawmedy",
  },
  description:
    "Describe your problem, share your documents, and get a properly formatted legal notice or RTI application, checked by a human advocate.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
