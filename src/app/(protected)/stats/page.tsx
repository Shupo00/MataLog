"use client";

import { useMemo } from "react";

import { ScoreIndicator } from "@/components/score-indicator";
import { cn } from "@/lib/utils";
import { computeRii } from "@/lib/rii";
import { useAkiStore } from "@/lib/store";
import { calculateCadenceDrift, calculateDashboardStats } from "@/lib/stats";
import { formatDateLabel } from "@/lib/utils";

export default function StatsPage() {
  const items = useAkiStore((state) => state.items);
  const logs = useAkiStore((state) => state.logs);

  const dashboardStats = useMemo(() => calculateDashboardStats(items, logs), [items, logs]);

  const { itemScores, averageScore } = useMemo(() => {
    const scores = items.map((item) => {
      const itemLogs = logs.filter((log) => log.itemId === item.id);
      return { item, rii: computeRii(item, itemLogs) };
    });

    const average = scores.length
      ? Math.round(
          scores.reduce((total, entry) => total + entry.rii.score, 0) / scores.length
        )
      : 0;

    return { itemScores: scores, averageScore: average };
  }, [items, logs]);

  const cadenceDrift = useMemo(() => calculateCadenceDrift(items, logs), [items, logs]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-100">統計ダッシュボード</h1>
        <p className="text-sm text-slate-400">
          最近のログ傾向やアイテム別の再燃度をチェックできます。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="本日のログ" value={dashboardStats.todayCount.toString()} hint="本日記録した回数" />
        <MetricCard title="直近7日" value={dashboardStats.weekCount.toString()} hint="過去7日間のログ数" />
        <MetricCard title="平均スコア" value={averageScore.toString()} hint="登録アイテムの平均値" />
        <MetricCard title="登録アイテム" value={items.length.toString()} hint="現在トラッキング中" />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100">アイテム別スコア</h2>
        <p className="text-sm text-slate-400">各対象の最新Mataスコアと最終ログ時刻です。</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {itemScores.map(({ item, rii }) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <ScoreIndicator score={rii.score} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {item.icon ? `${item.icon} ` : ""}
                  {item.name}
                </p>
                <p className="text-xs text-slate-400">
                  最終ログ: {rii.lastLog ? formatDateLabel(rii.lastLog.loggedAt) : "未記録"}
                </p>
                <p className="text-xs text-slate-500">目安間隔: {rii.sigmaDays.toFixed(1)} 日</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Cadence と実績のズレ</h2>
        <p className="text-sm text-slate-400">設定した間隔と直近ログ間隔の差分を確認できます。</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 text-left">アイテム</th>
                <th className="py-2 text-right">目安間隔(日)</th>
                <th className="py-2 text-right">平均間隔(日)</th>
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
                  <td
                    className={cn(
                      "py-3 text-right",
                      row.averageGapDays
                        ? row.deltaDays >= 0
                          ? "text-emerald-300"
                          : "text-amber-300"
                        : ""
                    )}
                  >
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500">{hint}</div>
    </div>
  );
}



