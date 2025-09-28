"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { CreateItemPayload, UpdateItemPayload } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AkiItem, UserPreferences } from "@/lib/types";

export interface ItemFormValues {
  name: string;
  category: string;
  icon: string;
  notes: string;
  cadenceDays: number;
  notifyWebPush: boolean;
  notifyEmail: boolean;
  primaryThreshold: number;
  strongThreshold: number;
}

interface ItemFormProps {
  mode: "create" | "edit";
  initialValues: ItemFormValues;
  onSubmit: (values: ItemFormValues) => void | Promise<void>;
  onDelete?: () => void;
}

const QUICK_PRESETS = [
  { days: 1, label: "1日" },
  { days: 3, label: "3日" },
  { days: 7, label: "1週間" },
  { days: 14, label: "2週間" },
  { days: 30, label: "1か月" },
] as const;

const EXTENDED_PRESETS = [
  { days: 0.5, label: "12時間" },
  { days: 2, label: "2日" },
  { days: 4, label: "4日" },
  { days: 5, label: "5日" },
  { days: 10, label: "10日" },
  { days: 21, label: "3週間" },
  { days: 42, label: "6週間" },
  { days: 60, label: "2か月" },
  { days: 90, label: "3か月" },
  { days: 120, label: "4か月" },
  { days: 180, label: "6か月" },
  { days: 365, label: "1年" },
] as const;

export function ItemForm({ mode, initialValues, onSubmit, onDelete }: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initialValues);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setValues(initialValues);
    if (mode === "create") {
      setSubmitState("idle");
    }
  }, [initialValues, mode]);

  const [showExtendedPresets, setShowExtendedPresets] = useState(false);

  useEffect(() => {
    if (submitState !== "saved") return;
    const timer = window.setTimeout(() => setSubmitState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [submitState]);

  const activePresetLabel = useMemo(() => {
    const allPresets = [...QUICK_PRESETS, ...EXTENDED_PRESETS];
    const preset = allPresets.find((option) => isSameCadence(option.days, values.cadenceDays));
    return preset?.label ?? null;
  }, [values.cadenceDays]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitState === "saving") return;

    setSubmitState("saving");
    try {
      await Promise.resolve(onSubmit(values));
      setSubmitState(mode === "edit" ? "saved" : "idle");
    } catch (error) {
      console.error("Failed to submit item form", error);
      setSubmitState("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          対象名
          <input
            required
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            placeholder="例：抹茶ラテ"
          />
        </label>
        <label className="text-xs text-slate-400">
          カテゴリ
          <input
            value={values.category}
            onChange={(event) => setValues((prev) => ({ ...prev, category: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            placeholder="例：カフェ"
          />
        </label>
        <label className="text-xs text-slate-400">
          アイコン（任意）
          <input
            value={values.icon}
            onChange={(event) => setValues((prev) => ({ ...prev, icon: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            placeholder="🍵"
            maxLength={4}
          />
        </label>
        <label className="text-xs text-slate-400">
          メモ（任意）
          <textarea
            value={values.notes}
            onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
            rows={1}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 leading-tight focus:border-emerald-400 focus:outline-none"
            placeholder="気分や制限などがあれば"
          />
        </label>
      </section>

      <section className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200">リズム設定</h3>
          {activePresetLabel ? (
            <span className="text-xs text-slate-400">プリセット: {activePresetLabel}</span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          次の「ちょうどいいタイミング」までの目安を選びます。クイックプリセットを押すか、日数入力で微調整できます。
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => setValues((prev) => ({ ...prev, cadenceDays: preset.days }))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                isSameCadence(preset.days, values.cadenceDays)
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200"
              )}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowExtendedPresets((flag) => !flag)}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
          >
            {showExtendedPresets ? "プリセットを閉じる" : "その他..."}
          </button>
        </div>
        {showExtendedPresets ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {EXTENDED_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, cadenceDays: preset.days }))}
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs transition",
                  isSameCadence(preset.days, values.cadenceDays)
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
        <label className="block text-xs text-slate-400">
          カスタム日数
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={values.cadenceDays}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next) && next > 0) {
                  setValues((prev) => ({ ...prev, cadenceDays: next }));
                }
              }}
              className="w-32 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
            <span className="text-xs text-slate-400">日ごと</span>
          </div>
        </label>
      </section>

      <section className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-slate-200">通知</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={values.notifyWebPush}
              onChange={(event) => setValues((prev) => ({ ...prev, notifyWebPush: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
            />
            Web Push
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={values.notifyEmail}
              onChange={(event) => setValues((prev) => ({ ...prev, notifyEmail: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
            />
            メール
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            標準しきい値
            <input
              type="number"
              min={0}
              max={100}
              value={values.primaryThreshold}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, primaryThreshold: Number(event.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-400">
            強しきい値
            <input
              type="number"
              min={0}
              max={100}
              value={values.strongThreshold}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, strongThreshold: Number(event.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between">
        {mode === "edit" && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-red-400 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
          >
            対象を削除
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col items-end gap-1">
          <button
            type="submit"
            disabled={submitState === "saving"}
            className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitState === "saving"
              ? mode === "create"
                ? "登録中..."
                : "保存中..."
              : mode === "create"
                ? "登録する"
                : "変更を保存"}
          </button>
          {mode === "edit" && submitState === "saved" ? (
            <span className="text-xs text-emerald-300">保存しました</span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function mapFormValuesToCreatePayload(values: ItemFormValues): CreateItemPayload {
  return {
    name: values.name,
    category: values.category,
    icon: values.icon || undefined,
    notes: values.notes || undefined,
    cadence: buildCadence(values),
    notifications: {
      enabled: values.notifyWebPush || values.notifyEmail,
      channels: { webPush: values.notifyWebPush, email: values.notifyEmail },
      thresholds: {
        primary: values.primaryThreshold,
        strong: values.strongThreshold,
      },
    },
  };
}

export function mapFormValuesToUpdatePayload(values: ItemFormValues): UpdateItemPayload {
  return {
    name: values.name,
    category: values.category,
    icon: values.icon,
    notes: values.notes,
    cadence: buildCadence(values),
    notifications: {
      enabled: values.notifyWebPush || values.notifyEmail,
      channels: { webPush: values.notifyWebPush, email: values.notifyEmail },
      thresholds: {
        primary: values.primaryThreshold,
        strong: values.strongThreshold,
      },
    },
  };
}

function buildCadence(values: ItemFormValues) {
  return { days: Math.max(0.5, values.cadenceDays) };
}

export function buildInitialValuesFromItem(
  item?: AkiItem | null,
  prefs?: Pick<UserPreferences, "primaryThresholdDefault" | "strongThresholdDefault">
): ItemFormValues {
  if (!item) {
    return {
      name: "",
      category: "",
      icon: "",
      notes: "",
      cadenceDays: 7,
      notifyWebPush: true,
      notifyEmail: false,
      primaryThreshold: prefs?.primaryThresholdDefault ?? 70,
      strongThreshold: prefs?.strongThresholdDefault ?? 85,
    };
  }

  return {
    name: item.name,
    category: item.category,
    icon: item.icon ?? "",
    notes: item.notes ?? "",
    cadenceDays: item.cadence.days,
    notifyWebPush: item.notifications.channels.webPush,
    notifyEmail: item.notifications.channels.email,
    primaryThreshold: item.notifications.thresholds.primary,
    strongThreshold: item.notifications.thresholds.strong,
  };
}

function isSameCadence(a: number, b: number) {
  return Math.abs(a - b) < 0.001;
}



