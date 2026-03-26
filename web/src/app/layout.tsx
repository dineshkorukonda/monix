import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "monix",
  description:
    "Web-facing security analysis with infrastructure context, hardening checks, and threat scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark selection:bg-[var(--accent)] selection:text-[var(--ink-strong)]"
      data-scroll-behavior="smooth"
    >
      <body
        className={`${poppins.variable} bg-background text-foreground antialiased`}
      >
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
