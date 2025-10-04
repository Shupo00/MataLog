import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import SupabaseProvider from "@/components/supabase-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "またログ | Matalog",
  description: "再会のタイミングを設計して知らせる習慣ログアプリです。",
  icons: {
    icon: [
      { url: "dark_square_1024.png?v=20251004", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="ja">
      <body className={[geistSans.variable, geistMono.variable, "antialiased bg-slate-950 text-slate-100"].join(" ")}>
        <SupabaseProvider initialSession={session}>{children}</SupabaseProvider>
      </body>
    </html>
  );
}

