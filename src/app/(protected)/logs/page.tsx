"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import { useAkiStore } from "@/lib/store";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

export default function LogsPage() {
  const [itemFilter, setItemFilter] = useState("all");

  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const items = useAkiStore((state) => state.items);
  const logs = useAkiStore((state) => state.logs);
  const deleteLog = useAkiStore((state) => state.deleteLog);

  const itemMap = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string }>();
    items.forEach((item) => map.set(item.id, { name: item.name, icon: item.icon }));
    return map;
  }, [items]);

  const filteredLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
    if (itemFilter === "all") return sorted;
    return sorted.filter((log) => log.itemId === itemFilter);
  }, [logs, itemFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filteredLogs>();
    filteredLogs.forEach((log) => {
      const dayKey = format(new Date(log.loggedAt), "yyyy-MM-dd");
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(log);
    });
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredLogs]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-100">ログ一覧</h1>
        <p className="text-sm text-slate-400">
          各対象の記録を時系列で確認できます。フィルターで対象を絞り込むこともできます。
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-400">対象</span>
          <select
            value={itemFilter}
            onChange={(event) => setItemFilter(event.target.value)}
            className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          >
            <option value="all">すべて</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">{filteredLogs.length} 件のログ</span>
      </div>

      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
            まだログがありません。
          </div>
        ) : (
          grouped.map(([day, dayLogs]) => (
            <section key={day} className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">
                {format(new Date(day), "yyyy年M月d日")}
              </h2>
              <div className="space-y-3">
                {dayLogs.map((log) => {
                  const itemInfo = itemMap.get(log.itemId);
                  return (
                    <article
                      key={log.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{formatDateTime(log.loggedAt)}</span>
                        <span>{formatRelative(log.loggedAt)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-100">
                          {itemInfo?.icon ? itemInfo.icon + " " : ""}
                          {itemInfo?.name ?? "対象不明"}
                        </span>
                        {typeof log.satisfaction === "number" ? (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                            満足度 {log.satisfaction}
                          </span>
                        ) : null}
                      </div>
                      {log.note ? (
                        <p className="mt-2 text-xs text-slate-300">{log.note}</p>
                      ) : null}
                      {session?.user ? (
                        <button
                          type="button"
                          onClick={() => deleteLog(supabase, log.id)}
                          className="mt-3 text-xs text-red-300 hover:text-red-200"
                        >
                          このログを削除
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
