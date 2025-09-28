"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ScoreIndicator } from "@/components/score-indicator";
import { computeRii } from "@/lib/rii";
import { useAkiStore } from "@/lib/store";
import { calculateCadenceDrift, calculateDashboardStats } from "@/lib/stats";
import { formatDateLabel } from "@/lib/utils";

export default function StatsPage() {
  const items = useAkiStore((state) => state.items);
  const logs = useAkiStore((state) => state.logs);

  const dashboardStats = useMemo(() => calculateDashboardStats(items, logs), [items, logs]);
  const cadenceDrift = useMemo(() => calculateCadenceDrift(items, logs), [items, logs]);
  const itemScores = useMemo(() => {
    return items.map((item) => {
      const itemLogs = logs.filter((log) => log.itemId === item.id);
      return { item, rii: computeRii(item, itemLogs) };
    });
  }, [items, logs]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">統計ダッシュボード</h1>
          <p className="text-sm text-slate-400">
            最近のログ状況やアイテム別のリズムをざっと振り返るためのサマリーです。
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-emerald-400/70"
        >
          ホームに戻る
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="本日のログ" value={dashboardStats.todayCount.toString()} hint="今日記録した回数" />
        <MetricCard title="直近7日" value={dashboardStats.weekCount.toString()} hint="過去7日間の記録数" />
        <MetricCard title="直近30日" value={dashboardStats.monthCount.toString()} hint="過去30日間の記録数" />
        <MetricCard title="登録アイテム" value={items.length.toString()} hint="現在トラッキング中" />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100">アイテム別スコア</h2>
        <p className="text-sm text-slate-400">直近のRIIや最後に記録した日付をざっと確認できます。</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {itemScores.map(({ item, rii }) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <ScoreIndicator score={rii.score} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {item.icon ? item.icon + " " : ""}
                  {item.name}
                </p>
                <p className="text-xs text-slate-400">
                  最終ログ: {rii.lastLog ? formatDateLabel(rii.lastLog.loggedAt) : "未記録"}
                </p>
                <p className="text-xs text-slate-500">基準間隔: {rii.sigmaDays.toFixed(1)} 日</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Cadence と実績のズレ</h2>
        <p className="text-sm text-slate-400">設定した間隔と実際のログ間隔の平均を比較します。</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 text-left">アイテム</th>
                <th className="py-2 text-right">目標間隔(日)</th>
                <th className="py-2 text-right">平均実績(日)</th>
                <th className="py-2 text-right">差分(日)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {cadenceDrift.map((row) => (
                <tr key={row.itemId}>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-slate-100">{row.name}</span>
                  </td>
                  <td className="py-3 text-right">{row.targetDays.toFixed(1)}</td>
                  <td className="py-3 text-right">{row.averageGapDays ? row.averageGapDays.toFixed(1) : "-"}</td>
                  <td className={`${row.averageGapDays ? (row.deltaDays >= 0 ? "text-emerald-300" : "text-amber-300") : ""} py-3 text-right`}>
                    {row.averageGapDays ? row.deltaDays.toFixed(1) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  hint: string;
}

function MetricCard({ title, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500">{hint}</div>
    </div>
  );
}
