"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import { ScoreIndicator } from "@/components/score-indicator";
import { computeRii } from "@/lib/rii";
import { useAkiStore } from "@/lib/store";
import { AkiItem, AkiLog } from "@/lib/types";
import { describeCadence, describeThresholds } from "@/lib/presentation";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

interface ItemCardProps {
  item: AkiItem;
  logs: AkiLog[];
  precomputedRii?: ReturnType<typeof computeRii>;
}

export function ItemCard({ item, logs, precomputedRii }: ItemCardProps) {
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const addLog = useAkiStore((state) => state.addLog);

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [satisfaction, setSatisfaction] = useState(80);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const rii = precomputedRii ?? computeRii(item, logs);
  const lastLog = rii.lastLog;
  const detailHref = `/items/${item.id}`;

  const lastLogText = lastLog
    ? `${formatRelative(lastLog.loggedAt)} / ${formatDateTime(lastLog.loggedAt)}`
    : "未記録です";

  const submitQuickLog = async () => {
    if (!session?.user) return;
    setIsSaving(true);
    await addLog(supabase, session.user.id, {
      itemId: item.id,
      satisfaction,
      note: note.trim() ? note.trim() : undefined,
    });
    setIsSaving(false);
    setQuickLogOpen(false);
    setNote("");
    setSatisfaction(80);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea")) return;
    router.push(detailHref);
  };

  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm transition hover:border-emerald-400/70 cursor-pointer"
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <ScoreIndicator score={rii.score} size="md" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-100">
                {item.icon ? `${item.icon} ` : ""}
                {item.name}
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {item.category}
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {describeCadence(item)}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              <span>最終ログ: {lastLogText}</span>
            </div>
            <div className="mt-1 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <span className="text-slate-400">{describeThresholds(item)}</span>
              {rii.nextPrimaryAt ? (
                <span className="inline-flex items-center gap-1 self-start rounded-full bg-slate-800/70 px-2 py-0.5 text-slate-200 sm:self-auto">
                  <span className="text-emerald-300">標準</span>
                  <span className="text-slate-300">{formatDateTime(rii.nextPrimaryAt)}</span>
                </span>
              ) : null}
              {item.notifications.strongEnabled && rii.nextStrongAt ? (
                <span className="inline-flex items-center gap-1 self-start rounded-full bg-slate-800/70 px-2 py-0.5 text-slate-200 sm:self-auto">
                  <span className="text-rose-300">強通知</span>
                  <span className="text-slate-300">{formatDateTime(rii.nextStrongAt)}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch justify-start gap-2 sm:w-48">
          <button
            type="button"
            onClick={() => setQuickLogOpen((flag) => !flag)}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
          >
            {quickLogOpen ? "キャンセル" : "今すぐ記録"}
          </button>
          <Link
            href={detailHref}
            className="rounded-full border border-slate-700 px-4 py-2 text-center text-sm text-slate-200 transition hover:border-emerald-400/70"
            onClick={(event) => event.stopPropagation()}
          >
            詳細を見る
          </Link>
        </div>
      </div>
      {quickLogOpen ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span>満足度</span>
            <span>{satisfaction}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={satisfaction}
            onChange={(event) => setSatisfaction(Number(event.target.value))}
            className="w-full accent-emerald-400"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="メモ（任意）"
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQuickLogOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
            >
              戻る
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={submitQuickLog}
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "保存中..." : "記録を保存"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

