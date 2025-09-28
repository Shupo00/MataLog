# プロダクト概要

* **名称**: 飽きログ（AkiLog）
* **タグライン**: 「飽きを設計し、楽しさを最大化する」
* **一言ピッチ**: 「◯◯をしてからどれだけ時間が経ったか」を見える化し、最適な“再会タイミング”で通知する、時間ベースの快楽コンディション可視化アプリ。
* **背景仮説**: 人は同じ行為を短期間で繰り返すと満足度が下がる（限界効用逓減）。適切な間隔を空けることで“再燃”しやすい。

---

## コア体験（Core Loop）

1. ユーザーが「対象（アイテム）」を登録（例: スイーツ、カフェ、趣味、ゲーム、アーティスト、外食チェーンなど）
2. 実行したらワンタップで「やった」ログを記録（日時＋オプションで満足度）
3. 経過時間から**飽きスコア（Re-Ignition Index = RII）**を算出
4. スコアがしきい値を越えたら通知 → 次の実行を促し、またログへ戻る

---

## Akiスコア（再燃度）設計

**目的**: 「今、もう一度やると楽しいか？」を 0〜100 で直感的に示す。

### ユーザー選択のスコア上昇頻度（Cadence）

* 各アイテムごとに、スコアが立ち上がる**時間スケール**をユーザーが選択できる。
* **モード**

  1. **Adaptive（推奨）**: 最適間隔 `τ`（カテゴリ or 学習）を使って指数型で増加（従来の式）。
  2. **Fixed Cadence**: ユーザーが「1日 / 1週間 / 1ヶ月」など**固定間隔 `C`**を選ぶ。Akiスコアは `C` に合わせて上昇。

     * 式は指数型を保ちつつ `τ' = C` とみなす（単調増加・逆算可能）。
     * **通知**は `t* = − C × ln(1 − T/100)` で時刻を逆算（T=70/85 など）。
  3. **Target Window**: 「○日±幅」で“最もおいしい窓”を設定。ウィンドウ内でスコアを高止まりに（通知は窓入りで1回）。

### 基本式

* 経過時間: `t`（最後の実行からの経過時間）
* 時間スケール: `σ`（Adaptive: `τ'` / Fixed: `C` ）
* 直近の満足度: `s`（0〜1）
* 新奇性補正: `n`（0.8〜1.2）

**指数型（推奨）**

* `RII = round( 100 * ( 1 - e^{- t / σ} ) * n )`
* `σ` はモードに応じて決定（Adaptive では満足度補正で伸縮: `τ' = τ * (1 + α s)`）。

**しきい値の逆算（通知）**

* `t* = - σ * ln(1 - T/100)`
* 例: `C = 7日, T=70 → t* ≈ 8.43日` / `T=85 → 13.28日`

**連続消費の抑制（密度補正）**

* 直近 `m` 回が近接している場合、`n` を下げる（例: `n = max(0.8, 1 - 0.2 * 密度)`）。

---

## 主要機能（MVP）

* 対象の登録/編集（名前、カテゴリ、アイコン、**最適間隔 τ or ユーザー選択の頻度（Cadence）**、通知オン/オフ、メモ）
* ワンタップ記録（「やった！」ボタン）＋任意の満足度スライダー（0〜100）
* タイムライン（いつ何をやったか）
* 統計ダッシュボード

  * 今日/週/月の実行数
  * 対象別ヒートマップ
  * Akiスコア推移
* 通知

  * スコアがしきい値を跨いだ時
  * 週次リマインド（まとめ/見逃し）
* 色と数字でコンディション表示（0〜100、緑系=高再燃・赤系=低再燃）

---

## UI/UX ラフ（画面案）

1. **ホーム（カードリスト）**

   * 各対象カード: 名前 / 最終実行からの経過時間 / Akiスコア（数値＋色リング）/ ワンタップ実行ボタン
   * 並び替え: 「スコア降順」「経過時間」「最近実行」
   * **頻度チップ**: `Adaptive` / `1日` / `1週間` / `1ヶ月` / `カスタム` をバッジ表示
2. **対象詳細**

   * Akiスコア・経過時間・時間スケール（σ）
   * **Cadenceセクション**

     * モード選択：Adaptive / Fixed / Window
     * Fixed: 「1日 / 3日 / 1週間 / 2週間 / 1ヶ月」プリセット＋カスタム（日数入力）
     * Window: 「中心○日 ± 幅○日」
     * しきい値（70/85）と通知ON/OFF、**スヌーズ**（1日/1週/1ヶ月）
   * 過去ログ（満足度メモ付き）
   * スコア推移グラフ（σ切替を反映）
3. **ログ画面**

   * 日付別に実行履歴を縦並び表示
4. **統計**

   * カテゴリ別回数 / 直近30日のヒートマップ / しきい値超え予測
   * **Cadence vs 実行実績のズレ**（目標に対して早すぎ/遅すぎ可視化）
5. **設定**

   * しきい値、通知時間帯、静穏（Do Not Disturb）

**色設計（例）**

* 0–39: #FCA5A5（淡赤）
* 40–69: #FCD34D（黄）
* 70–84: #86EFAC（淡緑）*通知候補*
* 85–100: #34D399（濃緑）*強通知*

---

## データモデル（Supabase/Postgres 推奨）

**users**

* id (uuid, pk)
* email, display_name, created_at

**items**（対象）

* id (uuid, pk)
* user_id (fk → users)
* name (text)
* category (text)
* tau_days (numeric) …最適間隔 τ（Adaptive用）
* cadence_mode (text) check in ('adaptive','fixed','window') default 'adaptive'
* cadence_days (numeric, nullable) …Fixed用 `C`
* window_center_days (numeric, nullable) / window_width_days (numeric, nullable) …Window用
* notify_enabled (bool)
* threshold_primary (int, default 70)
* threshold_strong (int, default 85)
* next_fire_at_primary (timestamptz, nullable)
* next_fire_at_strong (timestamptz, nullable)
* color (text, optional)
* created_at, updated_at

**logs**（実行ログ）

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
  if item.cadence_mode == 'window':
    return hours(item.window_center_days)
  // adaptive
  s = last_log?.satisfaction ? last_log.satisfaction/100 : 0.5
  return hours(item.tau_days) * (1 + 0.4 * s)

function computeRII(item, now):
  last = latest(logs where item_id=item.id)
  if !last: return 100  // 未体験は“試したい”
  t = hours_between(now, last.at)
  sig = sigma(item, last)

  // 連続密度補正（直近7日で同アイテムの回数）
  density = count(logs in last 7d) / 7
  novelty = max(0.8, 1 - 0.2 * density)

  base = 1 - exp(- t / sig)
  rii = round(100 * base * novelty)
  return clamp(rii, 0, 100)

function nextFireAt(item, last, threshold):
  sig = sigma(item, last)
  // 逆関数: t* = -sig * ln(1 - T/100)
  tstar = - sig * ln(1 - threshold/100)
  return last.at + tstar
```

**通知判定**

```pseudo
if prevRII < THRESHOLD <= currRII:
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
* `GET /items` → item list + computed RII（ビュー or RPC）
* `POST /logs` {item_id, at?, satisfaction?, note?}
* `GET /items/:id/rii` → 現在のRIIと次回予測
* `POST /notify/evaluate` → 全アイテムのRII再計算・通知

**DB ビュー例**

```sql
create view item_current_rii as
select i.id as item_id,
       compute_rii(i.id, now()) as rii
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

* 飽きログ / AkiLog / ReIgnite
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

※ いずれも**Adaptive**を選ぶと `τ` を起点に自動スケール。Fixedは上記から選択、Windowは中心値にこれらを当てて±幅（例：±2日/±1週）。

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
   * ホーム/詳細で RII をオンデマンド計算表示
6. **通知チャネル**（Web Push/Email）設定
7. **E2E動作確認** & 計測（通知→実行率）

---

## 追加マイグレーション（SQL）

```sql
-- items へ cadence/next_fire フィールド
alter table items
  add column if not exists cadence_mode text not null default 'adaptive' check (cadence_mode in ('adaptive','fixed','window')),
  add column if not exists cadence_days numeric,
  add column if not exists window_center_days numeric,
  add column if not exists window_width_days numeric,
  add column if not exists tau_days numeric default 3,
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

     * `fixed`: `cadence_days * 24`
     * `window`: `window_center_days * 24`
     * `adaptive`: `tau_days * (1 + 0.4 * s_last)` * 24

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
    else if (item.cadence_mode === 'window') sigmaDays = item.window_center_days;
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
  const ok = await sendEmail(user.email, subject(it), body(it, rii)).catch(() => false);
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
* テンプレ: 件名「『{{item}}』がベストタイミングです（{{rii}}）」

---

## クライアント連携（契約）

* **ログ作成** `POST /logs` → 成功後 `POST /functions/v1/recalc_next_fire { item_id }`
* **アイテム編集**（cadence/threshold 変更）→ 同上
* **RII表示**: フロントでオンデマンド計算

  * `t = now - last_at`（秒→時間）
  * `σ` は上記と同じ規則でUI側でも導出
  * `RII = 100 * (1 - exp(-t/σ))`（MVPは `n=1` でOK）
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

> 変数: `{{user}}`, `{{item}}`, `{{rii}}`, `{{elapsed}}`（例: 9日）, `{{deeplink}}`, `{{level}}`（primary/strong）
> 目安: Web Push は **title ≤ 30文字 / body ≤ 90文字** を推奨

### A) ミニマル（既定）

**Web Push**

* title: 今がベスト『{{item}}』
* body: 最後から{{elapsed}}。スコア{{rii}}。良いタイミングです。

**Email**

* subject: 『{{item}}』のベストタイミング（{{rii}}）
* body:
  こんにちは、{{user}} さん。最後に {{item}} を楽しんでから {{elapsed}} 経ち、スコアが {{rii}} に達しました。よければ今日もう一度どうぞ。
  アプリを開く → {{deeplink}}

---

### G) Strong（しきい値85+向け・緊急度アップ）

**Web Push**

* title: 逃すと薄まるかも『{{item}}』
* body: スコア{{rii}}（高）。今がピーク帯。良い再会を。

**Email**

* subject: ピーク帯です：『{{item}}』（{{rii}}）
* body:
  今がピーク帯です（{{rii}}）。最後から{{elapsed}}。満足しやすいタイミングを逃さずもう一度。→ {{deeplink}}

---

### H) 季節/時間帯（可変メッセージ例）

**Web Push（朝）**

* title: 朝の一杯に『{{item}}』
* body: {{elapsed}}ぶり、スコア{{rii}}。今日のスタートにどう？

**Web Push（夜）**

* title: 今日の締めに『{{item}}』
* body: スコア{{rii}}。軽く楽しんで、よく眠ろう。

---

### 英語版（国際化のたたき）

**Web Push**

* title: It’s the sweet spot — {{item}}
* body: {{elapsed}} since last time. Score {{rii}}. Now’s a great moment.

**Email**

* subject: Best timing for {{item}} ({{rii}})
* body:
  Hi {{user}}, it’s been {{elapsed}} since {{item}}. Your score is {{rii}} — a great moment to revisit. Open the app → {{deeplink}}

---

### 実装メモ

* `{{deeplink}}` は PWAの `/items/{{id}}` などを想定（Universal Link化できればベター）
* Strong/Primary でタイトルだけ差し替えも可（強度バリエーション維持）
* 通知文言は最大全角90文字前後/英語140字以内で折り返し崩れを防止
