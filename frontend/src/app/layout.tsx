import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { Home } from "lucide-react";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IJAR.AI — Rent Smarter",
  description:
    "Interactive heatmap tool that scores neighborhoods based on commute, amenities, budget, and lifestyle preferences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Link
          href="/"
          className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 backdrop-blur-sm border border-border/50 hover:bg-background transition-colors"
        >
          <Home className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">IJAR.AI</span>
        </Link>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
