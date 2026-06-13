import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaikAI Core",
  description: "Assistive Neural Engine",
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* This creates the beautiful dark-themed sliding notifications */}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}