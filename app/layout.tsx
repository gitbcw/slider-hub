import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slider Hub",
  description: "Upload, manage, and play HTML slider decks."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
