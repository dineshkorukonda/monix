import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "monix",
  description: "Real-time intrusion monitoring and autonomous defense for Linux infrastructure. High-density connection intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark selection:bg-white selection:text-black">
      <body
        className={`${geistMono.variable} font-mono antialiased bg-black text-white`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
