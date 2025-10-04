"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import { ItemCard } from "@/components/item-card";
import { computeRii } from "@/lib/rii";
import { useAkiStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

const SORT_OPTIONS = [
  { id: "score", label: "スコア" },
  { id: "elapsed", label: "経過時間" },
  { id: "recent", label: "最近の記録" },
] as const;

export default function HomePage() {
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["id"]>("score");
  const [query, setQuery] = useState("");

  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const hydrate = useAkiStore((state) => state.hydrate);
  const hasHydrated = useAkiStore((state) => state.hasHydrated);

  const items = useAkiStore((state) => state.items);
  const logs = useAkiStore((state) => state.logs);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || hasHydrated) return;
    void hydrate(supabase, userId);
  }, [session?.user?.id, hasHydrated, hydrate, supabase]);

  const itemsWithMetrics = useMemo(() => {
    return items.map((item) => {
      const itemLogs = logs.filter((log) => log.itemId === item.id);
      const rii = computeRii(item, itemLogs);
      return { item, itemLogs, rii };
    });
  }, [items, logs]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return itemsWithMetrics;
    return itemsWithMetrics.filter(({ item }) =>
      [item.name, item.category].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [itemsWithMetrics, query]);

  const sorted = useMemo(() => {
    const clone = filtered.slice();
    switch (sortBy) {
      case "elapsed":
        clone.sort((a, b) => b.rii.hoursSinceLast - a.rii.hoursSinceLast);
        break;
      case "recent":
        clone.sort(
          (a, b) =>
            new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime()
        );
        break;
      case "score":
      default:
        clone.sort((a, b) => b.rii.score - a.rii.score);
        break;
    }
    return clone;
  }, [filtered, sortBy]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSortBy(option.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                sortBy === option.id
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="対象名やカテゴリで検索"
            className="w-72 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <Link
            href="/items/new"
            className="hidden rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/10 sm:inline-flex"
          >
            対象を追加
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          sorted.map(({ item, itemLogs, rii }) => (
            <ItemCard key={item.id} item={item} logs={itemLogs} precomputedRii={rii} />
          ))
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
      <p>まだ対象が登録されていません。まずはトラッキングしたい対象を追加しましょう。</p>
      <Link
        href="/items/new"
        className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
      >
        最初の対象を登録
      </Link>
    </div>
  );
}
