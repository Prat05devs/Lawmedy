import type { Metadata } from "next";
import { Zalando_Sans, Zalando_Sans_Expanded } from "next/font/google";
import "./globals.css";
import "./design.css";
import "./refine.css";

// Brand kit: Zalando Sans Expanded for headings (kept on the --font-serif variable the CSS already uses),
// Zalando Sans for everything else.
const serif = Zalando_Sans_Expanded({ subsets: ["latin"], variable: "--font-serif", display: "swap", weight: ["400", "700", "800"] });
const sans = Zalando_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: {
    default: "Lawmedy — Legal notices & RTI, reviewed by advocates",
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
