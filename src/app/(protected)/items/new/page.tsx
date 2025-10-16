"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import { ItemForm, buildInitialValuesFromItem, mapFormValuesToCreatePayload } from "@/components/item-form";
import { useAkiStore } from "@/lib/store";
import type { Database } from "@/lib/supabase/types";

export default function NewItemPage() {
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient<Database>();
  const addItem = useAkiStore((state) => state.addItem);
  const preferences = useAkiStore((state) => state.preferences);
  const { primaryThresholdDefault, strongThresholdDefault } = preferences;

  const initialValues = useMemo(
    () =>
      buildInitialValuesFromItem(null, {
        primaryThresholdDefault,
        strongThresholdDefault,
      }),
    [primaryThresholdDefault, strongThresholdDefault]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-100">対象を新規登録</h1>
        <p className="text-sm text-slate-400">
          対象名や目標リズム、通知の初期設定を入力してください。内容は後からいつでも変更できます。
        </p>
      </header>
      <ItemForm
        mode="create"
        initialValues={initialValues}
        onSubmit={async (values) => {
          if (!session?.user) return;
          setIsSaving(true);
          setErrorMessage(null);
          const payload = mapFormValuesToCreatePayload(values);
          const id = await addItem(supabase, session.user.id, payload);
          setIsSaving(false);
          if (!id) {
            setErrorMessage("対象の作成に失敗しました。時間を置いて再度お試しください。");
            return;
          }
          router.push(`/items/${id}`);
        }}
      />
      {isSaving ? (
        <p className="text-sm text-slate-400">保存中です...</p>
      ) : null}
      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
    </div>
  );
}








