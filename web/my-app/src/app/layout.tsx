import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MONIX | AUTONOMOUS_SERVER_DEFENSE",
  description: "REAL-TIME INTRUSION MONITORING AND WEB SECURITY ANALYSIS",
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
      </body>
    </html>
  );
}
