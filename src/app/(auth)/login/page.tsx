"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import type { Database } from "@/lib/supabase/types";

export default function LoginPage() {
  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectedFrom = useMemo(() => searchParams?.get("redirectedFrom") ?? "/", [searchParams]);

  useEffect(() => {
    if (session) {
      router.replace(redirectedFrom);
    }
  }, [session, router, redirectedFrom]);

  useEffect(() => {
    if (!searchParams) return;
    const error = searchParams.get("error");
    if (!error) return;

    const errorDescription = searchParams.get("error_description");
    const message = mapAuthErrorToMessage(error, errorDescription);
    setErrorMessage(message);
    setInfoMessage(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    params.delete("error_description");
    const query = params.toString();
    router.replace(`/login${query ? `?${query}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoMessage(null);
    setErrorMessage(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setIsLoading(false);
    if (error) {
      setErrorMessage(`ログインリンクの送信に失敗しました: ${error.message}`);
      return;
    }
    setInfoMessage("メールにログインリンクを送りました。数分以内にご確認ください。");
    setEmail("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">またろぐにログイン</h1>
        <p className="mt-2 text-sm text-slate-400">
          登録済みのメールアドレスにマジックリンクを送信します。
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs text-slate-400">
            メールアドレス
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
              placeholder="your@email.com"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "送信中..." : "ログインリンクを送る"}
          </button>
        </form>
        {errorMessage ? (
          <p className="mt-4 text-sm text-red-300">{errorMessage}</p>
        ) : null}
        {infoMessage ? (
          <p className="mt-4 text-sm text-emerald-300">{infoMessage}</p>
        ) : null}
        <p className="mt-6 text-xs text-slate-500">
          アカウントが見つからない場合は、新しいメールでログインすると自動で作成されます。
        </p>
        <Link href="/" className="mt-6 inline-block text-xs text-slate-400 hover:text-slate-200">
          ← トップへ戻る
        </Link>
      </div>
    </div>
  );
}

function mapAuthErrorToMessage(error: string, description: string | null) {
  switch (error) {
    case "otp_expired":
      return "ログインリンクの有効期限が切れました。もう一度リンクを送信してください。";
    case "invalid_grant":
      return "ログインリンクが無効です。最新のメールに記載されたリンクをお試しください。";
    case "callback_error":
      const normalized = (description ?? "").toLowerCase();
      if (normalized.includes("code verifier") || normalized.includes("auth code")) {
        return "ログインセッションの検証に失敗しました。最新のリンクを使って再度ログインしてください。";
      }
      return description ?? "ログイン時にエラーが発生しました。再度お試しください。";

    default:
      return description ?? "ログインで問題が発生しました。少し時間をあけてもう一度お試しください。";
  }
}
