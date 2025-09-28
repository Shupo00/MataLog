"use client";

import { useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import { useAkiStore } from "@/lib/store";
import type { Database } from "@/lib/supabase/types";

export default function SettingsPage() {
  const preferences = useAkiStore((state) => state.preferences);
  const updatePreferencesRemote = useAkiStore((state) => state.updatePreferencesRemote);
  const setPreferencesLocal = useAkiStore((state) => state.setPreferencesLocal);

  const supabase = useSupabaseClient<Database>();
  const session = useSession();

  const [primaryThreshold, setPrimaryThreshold] = useState(preferences.primaryThresholdDefault);
  const [strongThreshold, setStrongThreshold] = useState(preferences.strongThresholdDefault);
  const [notifyStart, setNotifyStart] = useState(preferences.notifyHourStart);
  const [notifyEnd, setNotifyEnd] = useState(preferences.notifyHourEnd);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">設定</h1>
        <p className="text-sm text-slate-400">ここで登録したデフォルト値は、新規対象を作成するときに初期値として適用されます。</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100">通知の初期値</h2>
        <p className="text-sm text-slate-400">対象作成時の標準設定を決めましょう。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            標準通知しきい値
            <input
              type="number"
              min={0}
              max={100}
              value={primaryThreshold}
              onChange={(event) => setPrimaryThreshold(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-400">
            強通知しきい値
            <input
              type="number"
              min={0}
              max={100}
              value={strongThreshold}
              onChange={(event) => setStrongThreshold(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            通知許可時間（開始）
            <input
              type="number"
              min={0}
              max={23}
              value={notifyStart}
              onChange={(event) => setNotifyStart(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-400">
            通知許可時間（終了）
            <input
              type="number"
              min={0}
              max={23}
              value={notifyEnd}
              onChange={(event) => setNotifyEnd(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving || !session?.user}
          onClick={async () => {
            if (!session?.user) return;
            setSaving(true);
            const nextPrefs = {
              primaryThresholdDefault: primaryThreshold,
              strongThresholdDefault: strongThreshold,
              notifyHourStart: notifyStart,
              notifyHourEnd: notifyEnd,
            };
            setPreferencesLocal(nextPrefs);
            await updatePreferencesRemote(supabase, session.user.id, nextPrefs);
            setSaving(false);
          }}
          className="mt-6 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "保存中..." : "初期値を保存"}
        </button>
      </section>

      <section className="rounded-2xl border border-rose-500/40 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-rose-200">リセット（注意）</h2>
        <p className="text-sm text-slate-400">すべての対象とログを削除したい場合は、Supabase 側のデータベースから直接削除してください。</p>
      </section>
    </div>
  );
}