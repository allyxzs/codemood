import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CodeMood — Your code has feelings.",
  description:
    "Transforme seu histórico de commits em uma história visual. Explore conquistas, caos e recomeços com CodeMood.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
