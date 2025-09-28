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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-wide">飽きログ</span>
              <span className="text-xs uppercase tracking-widest text-slate-400">AkiLog</span>
            </Link>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              「飽きを設計し、楽しさを最大化する」リズム管理ダッシュボード
            </p>
          </div>
          <div className="flex items-center gap-3">
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
        <nav className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition",
                  active
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <main className="mx-auto min-h-[calc(100vh-120px)] max-w-6xl px-4 pb-16 pt-6">
        {children}
      </main>
    </div>
  );
}

