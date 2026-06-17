import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Concur — Concurrency Reference",
  description: "Flashcard drills, concept lookup, and daily listening for mastering concurrency patterns",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Concur" },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="flex flex-col min-h-screen md:flex-row">
        <Nav />
        <main className="flex-1 pb-20 md:pb-0 md:ml-56 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
