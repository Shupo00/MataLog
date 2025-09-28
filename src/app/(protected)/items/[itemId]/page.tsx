"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import {
  ItemForm,
  buildInitialValuesFromItem,
  mapFormValuesToUpdatePayload,
} from "@/components/item-form";
import { ScoreIndicator } from "@/components/score-indicator";
import { computeRii } from "@/lib/rii";
import { useAkiStore } from "@/lib/store";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient<Database>();

  const items = useAkiStore((state) => state.items);
  const logs = useAkiStore((state) => state.logs);
  const updateItem = useAkiStore((state) => state.updateItem);
  const deleteItem = useAkiStore((state) => state.deleteItem);
  const addLog = useAkiStore((state) => state.addLog);

  const item = useMemo(() => items.find((candidate) => candidate.id === itemId), [items, itemId]);
  const itemLogs = useMemo(
    () => logs.filter((log) => log.itemId === itemId),
    [logs, itemId]
  );

  const rii = useMemo(() => (item ? computeRii(item, itemLogs) : null), [item, itemLogs]);
  const initialValues = useMemo(() => buildInitialValuesFromItem(item ?? null), [item]);

  const [quickSatisfaction, setQuickSatisfaction] = useState(80);
  const [quickNote, setQuickNote] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!item) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">対象が見つかりません</h1>
          <Link
            href="/"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-emerald-400/70"
          >
            ダッシュボードに戻る
          </Link>
        </header>
        <p className="text-sm text-slate-400">
          リンクが古いか、対象が削除された可能性があります。ホームに戻って一覧を確認してください。
        </p>
      </div>
    );
  }

  const handleQuickLog = async () => {
    if (!session?.user) return;
    setIsSavingLog(true);
    await addLog(supabase, session.user.id, {
      itemId: item.id,
      satisfaction: quickSatisfaction,
      note: quickNote.trim() ? quickNote.trim() : undefined,
    });
    setIsSavingLog(false);
    setQuickNote("");
    setQuickSatisfaction(80);
  };

  const handleDeleteConfirmed = async () => {
    try {
      setIsDeleting(true);
      await deleteItem(supabase, item.id);
      router.push("/");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          {rii ? <ScoreIndicator score={rii.score} size="lg" /> : null}
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              {item.icon ? `${item.icon} ` : ""}
              {item.name}
            </h1>
            <p className="text-sm text-slate-400">
              {item.category} ｜ {rii?.lastLog ? `最終ログ: ${formatRelative(rii.lastLog.loggedAt)}` : "未記録"}
            </p>
            {rii ? (
              <p className="text-xs text-slate-500">
                目安間隔 {rii.sigmaDays.toFixed(1)} 日 / 経過 {rii.hoursSinceLast.toFixed(1)} 時間 / 新奇度 x{rii.noveltyFactor.toFixed(2)}
              </p>
            ) : null}
            {rii?.nextPrimaryAt ? (
              <p className="text-xs text-emerald-300">次の通知目安: {formatDateTime(rii.nextPrimaryAt)}</p>
            ) : null}
            {rii?.nextStrongAt ? (
              <p className="text-xs text-emerald-400">強通知目安: {formatDateTime(rii.nextStrongAt)}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:w-60">
          <button
            type="button"
            onClick={handleQuickLog}
            disabled={isSavingLog}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingLog ? "保存中..." : "今すぐ記録"}
          </button>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-400">
            <div className="flex items-center justify-between text-slate-300">
              <span>満足度</span>
              <span>{quickSatisfaction}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={quickSatisfaction}
              onChange={(event) => setQuickSatisfaction(Number(event.target.value))}
              className="w-full accent-emerald-400"
            />
            <input
              value={quickNote}
              onChange={(event) => setQuickNote(event.target.value)}
              placeholder="メモ（任意）"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-slate-100">設定</h2>
          <p className="text-sm text-slate-400">タイミングや通知を調整したいときは、下のフォームから更新できます。</p>
          <div className="mt-4">
            <ItemForm
              mode="edit"
              initialValues={initialValues}
              onSubmit={async (values) => {
                const payload = mapFormValuesToUpdatePayload(values);
                await updateItem(supabase, item.id, payload);
              }}
              onDelete={() => setShowDeleteModal(true)}
            />
            {isDeleting ? <p className="mt-2 text-xs text-slate-400">削除を実行しています...</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-slate-100">ログ履歴</h2>
          <p className="text-sm text-slate-400">最近の記録を確認できます。フォームから追加したメモも表示されます。</p>
          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-2">
            {itemLogs.length === 0 ? (
              <p className="text-sm text-slate-500">まだこの対象のログはありません。</p>
            ) : (
              itemLogs.map((log) => <LogRow key={log.id} log={log} />)
            )}
          </div>
        </div>
      </section>
      </div>

      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
          <div className="flex h-full items-center justify-center px-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-item-title"
              className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-slate-200 shadow-2xl"
            >
              <div className="space-y-1">
                <h2 id="delete-item-title" className="text-lg font-semibold text-slate-100">
                  この対象を削除しますか？
                </h2>
                <p className="text-sm text-slate-400">
                  削除すると『{item.icon ? `${item.icon} ` : ""}{item.name}』のログや通知設定もすべて消えます。この操作は取り消せません。
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  disabled={isDeleting}
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-inner transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeleting ? "削除中..." : "削除する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LogRow({ log }: { log: { id: string; loggedAt: string; satisfaction?: number; note?: string } }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{formatDateTime(log.loggedAt)}</span>
        {typeof log.satisfaction === "number" ? <span>満足度 {log.satisfaction}</span> : null}
      </div>
      {log.note ? <p className="mt-1 text-xs text-slate-300">{log.note}</p> : null}
    </div>
  );
}
