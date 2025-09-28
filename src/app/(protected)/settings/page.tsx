"use client";

import Link from "next/link";
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
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">設定</h1>
          <p className="text-sm text-slate-400">通知しきい値など、AkiLog全体の基本設定を調整します。</p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400/70 hover:text-emerald-200"
        >
          ホームに戻る
        </Link>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-slate-100">通知しきい値</h2>
        <p className="text-sm text-slate-400">標準通知・強通知の既定値を設定します。</p>
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
        <button
          type="button"
          disabled={saving || !session?.user}
          onClick={async () => {
            if (!session?.user) return;
            setSaving(true);
            const nextPrefs = {
              primaryThresholdDefault: primaryThreshold,
              strongThresholdDefault: strongThreshold,
            };
            setPreferencesLocal(nextPrefs);
            await updatePreferencesRemote(supabase, session.user.id, nextPrefs);
            setSaving(false);
          }}
          className="mt-6 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </section>

      <section className="rounded-2xl border border-rose-500/40 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-rose-200">注意事項</h2>
        <p className="text-sm text-slate-400">
          ベータ版のため一部の設定は今後変更される可能性があります。重要な項目は別途メモしておくことをおすすめします。
        </p>
      </section>
    </div>
  );
}
