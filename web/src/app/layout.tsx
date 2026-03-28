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
    "Security, SEO, and performance analysis in one workspace. Sign in for category scores, shareable reports, and a dashboard for projects and scan history.",
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
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
