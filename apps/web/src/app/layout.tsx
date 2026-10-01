import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Lawmedy — A clearer way forward",
    template: "%s | Lawmedy",
  },
  description:
    "A private place to start your legal matter and keep your story in one place.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
