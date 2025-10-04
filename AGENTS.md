**items**（対象）\n\n* id (uuid, pk)\n* user_id (fk → users)\n* name (text)\n* category (text)\n* tau_days (numeric) …最適間隔 τ（Adaptive 用）\n* cadence_mode (text) check in ('adaptive','fixed') default 'adaptive'\n* cadence_days (numeric, nullable) …Fixed 用 C\n* notifications_enabled (bool)\n* notify_web_push (bool default true)\n* notify_email (bool default false)\n* notify_strong (bool default false)\n* threshold_primary (int, default 70)\n* threshold_strong (int, default 85)\n* next_fire_at_primary (timestamptz, nullable)\n* next_fire_at_strong (timestamptz, nullable)\n* created_at, updated_at\n\n**logs**（実行ログ）

* id (uuid, pk)
* item_id (fk → items)
* at (timestamptz)
* satisfaction (int 0–100, nullable)
* note (text)
* created_at

**preferences**（ユーザー設定）

* user_id (pk)
* dnd_start (time, nullable)  // 現状未使用でも保持
* dnd_end (time, nullable)
* weekly_digest_weekday (int, nullable)
* timezone
* **notify_channel text not null default 'both' check (notify_channel in ('webpush','email','both'))**

**push_subscriptions**（Web Push端末登録）

* id (uuid, pk)
* user_id (fk → users)
* endpoint (text not null)
* p256dh (text not null)
* auth (text not null)
* user_agent (text)
* created_at timestamptz default now()
* last_success_at timestamptz
* is_active boolean default true

**notifications**

* id (uuid, pk)
* item_id (fk)
* fired_at (timestamptz)
* level (text: "primary"|"strong")
* delivered (bool)
* channel (text)  // 'webpush' | 'email'

**インデックス**

* logs(item_id, at desc)
* items(user_id, category)
* items(next_fire_at_primary), items(next_fire_at_strong)
* push_subscriptions(user_id, is_active)

---

## 算出ロジック（擬似コード）

```pseudo
function sigma(item, last_log):
  if item.cadence_mode == 'fixed':
    return hours(item.cadence_days)
  // adaptive
  s = last_log?.satisfaction ? last_log.satisfaction/100 : 0.5
  return hours(item.tau_days) * (1 + 0.4 * s)

function computeScore(item, now):
  last = latest(logs where item_id=item.id)
  if !last: return 100  // 未体験は“試したい”
  t = hours_between(now, last.at)
  sig = sigma(item, last)

  // 連続密度補正（直近7日で同アイテムの回数）
  density = count(logs in last 7d) / 7
  novelty = max(0.8, 1 - 0.2 * density)

  base = 1 - exp(- t / sig)
  score = round(100 * base * novelty)
  return clamp(score, 0, 100)

function nextFireAt(item, last, threshold):
  sig = sigma(item, last)
  // 逆関数: t* = -sig * ln(1 - T/100)
  tstar = - sig * ln(1 - threshold/100)
  return last.at + tstar
```

**通知判定**

```pseudo
if prevScore < THRESHOLD <= currScore:
  fire_notification(level)

// ログ追加時 or Cadence変更時
item.next_fire_at_primary = nextFireAt(item, last, item.threshold_primary)
item.next_fire_at_strong  = nextFireAt(item, last, item.threshold_strong)
```

---

## 技術スタック（想定）

* **フロント**: Next.js（App Router）+ TypeScript + Tailwind + shadcn/ui + Recharts
* **バック**: Supabase（Auth/DB/Storage/Edge Functions/cron）
* **通知**: Supabase Edge Functions + 1h/3h/1d 間隔の `cron` / Web Push + メール（任意）
* **分析**: SQL + dbt（任意）
* **インフラ代替案**: Cloudflare D1/Workers + Push / Firebase

---

## API スケッチ（RLS前提、Edge Functions）

* `POST /items` {name, category, tau_days, thresholds}
* `GET /items` → item list + computed またスコア（ビュー or RPC）
* `POST /logs` {item_id, at?, satisfaction?, note?}
* `GET /items/:id/score` → 現在のまたスコアと次回予測
* `POST /notify/evaluate` → 全アイテムのまたスコア再計算・通知

**DB ビュー例**

```sql
create view item_current_score as
select i.id as item_id,
       compute_score(i.id, now()) as またスコア
from items i;
```

---

## インテリジェンス（将来拡張）

* パーソナライズ最適間隔 `τ` の学習（ベイズ更新/バンディット）
* カテゴリ別ベースライン（甘味・運動・人間関係など）
* “やりすぎ検知”（健康/家計観点での抑制）
* 連鎖最適化（例: コーヒー→甘味→読書の最適並び）
* 共同編集/ペア機能（友人と“再会計画”を共有）

---

## セキュリティ/プライバシー

* RLS: items/logs を user_id で制限
* 匿名化共有リンク（数値のみ公開）
* オフライン対応（IndexedDBキャッシュ、再同期）

---

## KPI（MVP）

* WAU、MAU、1人あたり登録アイテム数
* 1週間あたりの“良い再会”（しきい値跨ぎ→実行まで）率
* 通知→実行の転換率、通知疲れ率（無視/オフ）

---

## ネーミング & コピー候補

* またろぐ / またろぐ / ReIgnite
* コピー: 「ケーキは“待つほど”おいしい」/「欲望にも休息を」/「また会う日の設計図」

---

## Cadence プリセット設計

**方針**: 選択肢は**少なく見せて多く備える**（ジャム問題回避）。

* 1画面は**5つのクイックプリセット**＋「その他…」
* 「その他…」で拡張プリセット（約12）と**カスタム日数**を解放
* カテゴリ登録時は**カテゴリ別おすすめ**を最初に提示
* 使い始め後は**履歴からの学習候補**（直近の間隔中央値±α）を最上段に

### クイック（常時表示・チップ）

* **1日 / 3日 / 1週間 / 2週間 / 1ヶ月**

### 拡張（モーダルで展開）

* 12時間, 2日, 4日, 5日, 10日
* 3週間, 6週間
* 2ヶ月, 3ヶ月, 4ヶ月, 6ヶ月
* 1年

> 目安：人間の“サイクル直感”に合うキリの良い単位を中心に。10日・6週間・3ヶ月などは習慣/趣味でよく使われる。

### カテゴリ別おすすめ（初回登録時）

* **甘味/外食**: 3日 / 1週間 / 2週間
* **コーヒー/カフェ**: 1日 / 2日 / 3日
* **運動**: 2日 / 3日 / 1週間
* **ゲーム/動画**: 3日 / 1週間 / 2週間
* **人間関係（会う・通話）**: 1週間 / 2週間 / 1ヶ月
* **買い物/課金**: 2週間 / 1ヶ月 / 3ヶ月

※ いずれも**Adaptive**を選ぶと `τ` を起点に自動スケール。Fixedは上記から選択。

### UI提案

* **プリセットチップ**（クイック5件）＋「その他…」ボタン
* 拡張は**セクション分け**：短期（<1週）／中期（1〜6週）／長期（>1.5ヶ月）
* **最近使った3件**をクイック列の右端にローテーション表示
* **“おすすめ”トグル**：履歴から算出した候補（例：あなたは平均9.2日→**10日**を提案）

### 実装ポイント

* `items.cadence_mode` が `fixed` のとき、プリセット選択で `cadence_days` を更新
* `cadence_days` 変更時に `next_fire_at_*` を逆算し直して保存
* カスタムは **1〜365日**の範囲でバリデーション

---

## 次アクション（作業ToDo）

1. **DBマイグレーション適用**（下記SQL）
2. **RLS/ポリシー**確認（service role でEdge Functionsから実行）
3. **Edge Function: `notify`**（cron起動）
4. **Edge Function: `recalc_next_fire`**（ログ作成・cadence変更時に呼ぶ）
5. **クライアント**

   * ログ作成後に `recalc_next_fire` を呼ぶ
   * アイテム編集で cadence/threshold 変更時も同様
   * ホーム/詳細で またスコア をオンデマンド計算表示
6. **通知チャネル**（Web Push/Email）設定
7. **E2E動作確認** & 計測（通知→実行率）

---

## 追加マイグレーション（SQL）

```sql
-- items へ cadence/next_fire フィールド
alter table items
  add column if not exists cadence_mode text not null default 'adaptive' check (cadence_mode in ('adaptive','fixed')),
  add column if not exists cadence_days numeric,    add column if not exists tau_days numeric default 3,
  add column if not exists next_fire_at_primary timestamptz,
  add column if not exists next_fire_at_strong timestamptz;

create index if not exists idx_items_next_fire_primary on items(next_fire_at_primary);
create index if not exists idx_items_next_fire_strong on items(next_fire_at_strong);
```

---

## サーバ計算ロジック（SQL関数）

指数式の逆算をPostgresで行うための関数。`sigma_hours` は UI/Edge で決定した値を渡す想定。

```sql
-- t* = -sigma * ln(1 - T/100)
create or replace function compute_next_fire(
  last_at timestamptz,
  sigma_hours numeric,
  threshold int
) returns timestamptz language sql immutable as $$
  select case when last_at is null or sigma_hours is null or threshold is null
              then null
              else last_at + ((- sigma_hours * ln(1 - threshold::numeric/100)) || ' hours')::interval
         end;
$$;
```

---

## Edge Function: `recalc_next_fire`

* **目的**: ログ追加/編集、アイテムの cadence/threshold 変更時に、`next_fire_at_primary/strong` を再計算して保存。
* **入力**: `item_id`
* **処理**:

  1. `last_at = (select at from logs where item_id = $1 order by at desc limit 1)`
  2. `sigma_hours` を決定：

     * `fixed`: `cadence_days * 24`     * `adaptive`: `tau_days * (1 + 0.4 * s_last)` * 24

       * `s_last` は直近ログの `coalesce(satisfaction, 50)/100`
  3. `next_fire_at_primary = compute_next_fire(last_at, sigma_hours, threshold_primary)`
  4. `next_fire_at_strong  = compute_next_fire(last_at, sigma_hours, threshold_strong)`
  5. `items` を更新

**TypeScript 雛形**（Supabase Edge Functions）

```ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { item_id } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1) item と last log
    const { data: item } = await supabase.from('items').select('*').eq('id', item_id).single();
    const { data: last } = await supabase.from('logs').select('at, satisfaction').eq('item_id', item_id).order('at', { ascending:false }).limit(1).maybeSingle();

    if (!item || !last) {
      // 未体験：次回発火は無し
      await supabase.from('items').update({ next_fire_at_primary: null, next_fire_at_strong: null }).eq('id', item_id);
      return new Response(JSON.stringify({ ok: true }));
    }

    const s = (last.satisfaction ?? 50) / 100;
    let sigmaDays: number;
    if (item.cadence_mode === 'fixed') sigmaDays = item.cadence_days;
    else sigmaDays = item.tau_days * (1 + 0.4 * s);

    const sigmaHours = sigmaDays * 24;
    const next = async (thr: number) => {
      const { data } = await supabase.rpc('compute_next_fire', { last_at: last.at, sigma_hours: sigmaHours, threshold: thr });
      return data as string | null; // timestamptz
    };

    const p = await next(item.threshold_primary);
    const g = await next(item.threshold_strong);

    await supabase.from('items').update({ next_fire_at_primary: p, next_fire_at_strong: g }).eq('id', item_id);
    return new Response(JSON.stringify({ ok: true }));
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
```

---

## Edge Function: `notify`（cron起動）

* **スケジュール**: 15分毎（`crontab: */15 * * * *`）
* **処理**:

  1. `now()` 時点で `next_fire_at_primary/strong` を超えたアイテムを取得
  2. 重複防止: 当日同一レベル・同一チャネルは一度のみ（`notifications` 参照）
  3. **配信チャネル分岐**（`preferences.notify_channel`）

     * `webpush` → Web Push 送信
     * `email` → メール送信
     * `both` → 両方送信（失敗したチャネルのみリトライ）
  4. 送信ログを `notifications` に記録
  5. 送信後、`items.next_fire_at_*` を `NULL` に（次のログまで再発火なし）

**TypeScript 擬似コード（要点）**

```ts
const prefs = await supabase.from('preferences').select('notify_channel, timezone').eq('user_id', it.user_id).single();
const channel = prefs?.notify_channel ?? 'both';

if (channel === 'webpush' || channel === 'both') {
  const subs = await supabase.from('push_subscriptions').select('*').eq('user_id', it.user_id).eq('is_active', true);
  for (const s of subs.data ?? []) {
    const ok = await sendWebPush(s.endpoint, s.p256dh, s.auth, payload).catch(() => false);
    if (!ok) markInactive(s.id);
    logNotification(it.id, 'webpush', ok);
  }
}

if (channel === 'email' || channel === 'both') {
  const ok = await sendEmail(user.email, subject(it), body(it, またスコア)).catch(() => false);
  logNotification(it.id, 'email', ok);
}
```

**Web Push 送信の実装メモ**

* PWA/Service Worker 必須（`service-worker.js` で `push` イベントを受信して `showNotification`）
* 端末登録: `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })`
* 取得した `endpoint/p256dh/auth` を `push_subscriptions` に保存
* Edge では VAPID 署名を付けて HTTP リクエストで `endpoint` に送信（Deno対応の実装を利用）

**メール送信 実装メモ**

* プロバイダ例: Resend / SendGrid / Postmark / SMTP
* 環境変数: `RESEND_API_KEY` など
* テンプレ: 件名「『{{item}}』がベストタイミングです（{{またスコア}}）」

---

## クライアント連携（契約）

* **ログ作成** `POST /logs` → 成功後 `POST /functions/v1/recalc_next_fire { item_id }`
* **アイテム編集**（cadence/threshold 変更）→ 同上
* **またスコア表示**: フロントでオンデマンド計算

  * `t = now - last_at`（秒→時間）
  * `σ` は上記と同じ規則でUI側でも導出
  * `またスコア = 100 * (1 - exp(-t/σ))`（MVPは `n=1` でOK）
* **Web Push登録フロー**

  1. 初回起動で通知許可をリクエスト
  2. `navigator.serviceWorker.register('/service-worker.js')`
  3. `pushManager.subscribe(...)` で `endpoint/p256dh/auth` を取得
  4. API経由で `push_subscriptions` に保存
* **ユーザー設定**

  * `preferences.notify_channel` を選択（webpush/email/both）
  * 将来拡張: 端末単位の on/off, テスト通知

---

## テスト観点（MVP）

* **境界**: しきい値直前/直後、未体験、満足度0/100、cadence切替
* **連投**: 24h以内に複数ログ→`recalc_next_fire` が都度更新されるか
* **通知**: 同一レベルの多重送信防止、DND時間帯スキップ（将来）
* **RLS**: 他ユーザーの items/logs にアクセス不可
* **タイムゾーン**: UTC保存/JST表示のズレなし

---

## 環境変数（Edge Functions）

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
* **Web Push**: `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`
* **Email（例: Resend）**: `RESEND_API_KEY`（または `SENDGRID_API_KEY` / SMTP 各種）

---

## 通知テンプレ（コピー）

> 変数: `{{user}}`, `{{item}}`, `{{またスコア}}`, `{{elapsed}}`（例: 9日）, `{{deeplink}}`, `{{level}}`（primary/strong）
> 目安: Web Push は **title ≤ 30文字 / body ≤ 90文字** を推奨

### A) ミニマル（既定）

**Web Push**

* title: 今がベスト『{{item}}』
* body: 最後から{{elapsed}}。スコア{{またスコア}}。良いタイミングです。

**Email**

* subject: 『{{item}}』のベストタイミング（{{またスコア}}）
* body:
  こんにちは、{{user}} さん。最後に {{item}} を楽しんでから {{elapsed}} 経ち、スコアが {{またスコア}} に達しました。よければ今日もう一度どうぞ。
  アプリを開く → {{deeplink}}

---

### G) Strong（しきい値85+向け・緊急度アップ）

**Web Push**

* title: 逃すと薄まるかも『{{item}}』
* body: スコア{{またスコア}}（高）。今がピーク帯。良い再会を。

**Email**

* subject: ピーク帯です：『{{item}}』（{{またスコア}}）
* body:
  今がピーク帯です（{{またスコア}}）。最後から{{elapsed}}。満足しやすいタイミングを逃さずもう一度。→ {{deeplink}}

---

### H) 季節/時間帯（可変メッセージ例）

**Web Push（朝）**

* title: 朝の一杯に『{{item}}』
* body: {{elapsed}}ぶり、スコア{{またスコア}}。今日のスタートにどう？

**Web Push（夜）**

* title: 今日の締めに『{{item}}』
* body: スコア{{またスコア}}。軽く楽しんで、よく眠ろう。

---

### 英語版（国際化のたたき）

**Web Push**

* title: It’s the sweet spot — {{item}}
* body: {{elapsed}} since last time. Score {{またスコア}}. Now’s a great moment.

**Email**

* subject: Best timing for {{item}} ({{またスコア}})
* body:
  Hi {{user}}, it’s been {{elapsed}} since {{item}}. Your score is {{またスコア}} — a great moment to revisit. Open the app → {{deeplink}}

---

### 実装メモ

* `{{deeplink}}` は PWAの `/items/{{id}}` などを想定（Universal Link化できればベター）
* Strong/Primary でタイトルだけ差し替えも可（強度バリエーション維持）
* 通知文言は最大全角90文字前後/英語140字以内で折り返し崩れを防止











