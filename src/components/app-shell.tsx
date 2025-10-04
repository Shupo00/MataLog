"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import { useAkiStore } from "@/lib/store";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "ホーム" },
  { href: "/logs", label: "ログ" },
  { href: "/stats", label: "統計" },
  { href: "/settings", label: "設定" },
];

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient<Database>();

  const hydrate = useAkiStore((state) => state.hydrate);
  const hasHydrated = useAkiStore((state) => state.hasHydrated);
  const clear = useAkiStore((state) => state.clear);

  useEffect(() => {
    if (session === null) {
      if (hasHydrated) {
        clear();
      }
      return;
    }

    const userId = session?.user?.id;
    if (!userId || hasHydrated) return;

    void hydrate(supabase, userId);
  }, [session, hasHydrated, hydrate, supabase, clear]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clear();
    router.replace("/login");
  };

  const renderNavLinks = () => (
    <nav className="flex flex-wrap items-center gap-2 justify-start">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition",
              active ? "bg-slate-200 text-slate-900" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-2 sm:px-10 sm:py-4">
          <header className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tracking-wide">またろぐ</span>
                <span className="text-xs uppercase tracking-widest text-slate-400">Matalog</span>
              </Link>
              <p className="text-xs text-slate-400 sm:text-sm">
                「再会のタイミング」をデザインする記録アプリ
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">{renderNavLinks()}</div>
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                <Link
                  href="/items/new"
                  className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
                >
                  対象を追加
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </header>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-10 sm:px-10 sm:pb-28 sm:pt-10">{children}</main>
    </div>
  );
}

