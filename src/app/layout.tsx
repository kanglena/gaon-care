import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gaon-care",
  description: "Daechi Middle School umbrella rental",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
