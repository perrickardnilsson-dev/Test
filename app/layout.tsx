import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NO-provplattform",
  description:
    "Plattform för NO-lärare på högstadiet: generera prov från nationella prov, låt elever göra dem digitalt och rätta med AI-stöd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
