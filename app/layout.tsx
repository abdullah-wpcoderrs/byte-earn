import type { Metadata } from "next";
import { Suspense } from "react";
import { ToastViewport } from "@/components/ui/toast-viewport";
import "./globals.css";

export const metadata: Metadata = {
  title: "byte-earn | Social Earning Network",
  description:
    "A premium AI-driven social media monetization platform for creators, referrals, sponsored tasks, and wallet withdrawals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Suspense fallback={null}>
          <ToastViewport />
        </Suspense>
      </body>
    </html>
  );
}
