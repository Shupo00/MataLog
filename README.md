# またろぐ

譎る俣繝吶・繧ｹ縺ｧ縲悟・莨壹・繝吶せ繝医ち繧､繝溘Φ繧ｰ縲阪ｒ遏･繧峨○繧狗ｿ呈・繝ｭ繧ｰ繧｢繝励Μ縺ｧ縺吶ゅヵ繝ｭ繝ｳ繝医お繝ｳ繝峨・ Next.js縲√ヰ繝・け繧ｨ繝ｳ繝峨・ Supabase 繧貞茜逕ｨ縺励※縺・∪縺吶・
## 繝ｭ繝ｼ繧ｫ繝ｫ髢狗匱

```bash
npm install
npm run dev
```

### Supabase 縺ｮ繧ｻ繝・ヨ繧｢繝・・

```bash
supabase start
supabase db reset
```

騾夂衍繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ逕ｨ縺ｮ譛譁ｰ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧帝←逕ｨ縺吶ｋ縺溘ａ縺ｫ `supabase db reset` 繧貞ｮ溯｡後＠縺ｦ縺上□縺輔＞縲・
## 騾夂衍繝代う繝励Λ繧､繝ｳ

### 1. 繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ蜀崎ｨ育ｮ・(`recalc_next_fire`)

- 蠖ｹ蜑ｲ: 繝ｭ繧ｰ霑ｽ蜉繝ｻ蟇ｾ雎｡邱ｨ髮・ｾ後↓谺｡縺ｮ騾夂衍繧ｿ繧､繝溘Φ繧ｰ繧定ｨ育ｮ励＠縺ｦ `items.next_fire_at_primary` / `items.next_fire_at_strong` 繧呈峩譁ｰ縺吶ｋ縲・- 蜻ｼ縺ｳ蜃ｺ縺・ 繝輔Ο繝ｳ繝医お繝ｳ繝峨・ `useAkiStore` 縺瑚・蜍輔〒 Edge Function (`POST /functions/v1/recalc_next_fire`) 繧貞娼縺阪∪縺吶・- 蠢・育腸蠅・､画焚・・dge Function 螳溯｡檎腸蠅・ｼ・
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 2. 騾夂衍蛻､螳夲ｼ城∽ｿ｡ (`notify_dispatch`)

- 蠖ｹ蜑ｲ: Cron 遲峨〒 15 蛻・・ 譎る俣縺ｫ荳蠎ｦ蜻ｼ縺ｳ蜃ｺ縺励√＠縺阪＞蛟､繧定ｶ・∴縺溘い繧､繝・Β縺ｫ Web Push / Email 騾夂衍繧帝√ｋ縲・- 蜻ｼ縺ｳ蜃ｺ縺嶺ｾ・

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/notify_dispatch \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

- 謗ｨ螂ｨ繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ: Supabase 蜈ｬ蠑上・ Edge Function Scheduler 縺ｧ `*/15 * * * *`縲・- `dryRun: true` 繧呈ｸ｡縺吶→騾∽ｿ｡縺帙★縺ｫ蛻､螳夂ｵ先棡縺縺題ｿ斐＠縺ｾ縺吶・
#### Edge Function 逕ｨ迺ｰ蠅・､画焚

| 螟画焚蜷・| 逕ｨ騾・| 蠢・・| 蛯呵・|
| --- | --- | --- | --- |
| `SUPABASE_URL` | Supabase 繝励Ο繧ｸ繧ｧ繧ｯ繝・URL | 笨・| Service Role 逕ｨ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | 笨・| |
| `APP_URL` | 騾夂衍蜀・・ deeplink 繝吶・繧ｹ URL | 笨・| 萓・ `https://app.またろぐ.jp` |
| `PUSH_VAPID_PUBLIC_KEY` | Web Push VAPID 蜈ｬ髢矩嵯 | Web Push 蛻ｩ逕ｨ譎・| |
| `PUSH_VAPID_PRIVATE_KEY` | Web Push VAPID 遘伜ｯ・嵯 | Web Push 蛻ｩ逕ｨ譎・| |
| `PUSH_VAPID_SUBJECT` | Web Push 騾｣邨｡蜈・(萓・ `mailto:support@example.com`) | Web Push 蛻ｩ逕ｨ譎・| |
| `RESEND_API_KEY` | Resend API Key | Email 蛻ｩ逕ｨ譎・| 莉悶・繝ｭ繝舌う繝縺ｸ蟾ｮ縺玲崛縺亥庄 |
| `RESEND_FROM_EMAIL` | 騾∽ｿ｡蜈・Γ繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ |
 Email 蛻ｩ逕ｨ譎・| `no-reply@` 謗ｨ螂ｨ |

縺ｩ縺｡繧峨°縺ｮ繝√Ε繝阪Ν縺梧悴險ｭ螳壹〒繧ゅ∬ｨｭ螳壽ｸ医∩繝√Ε繝阪Ν縺ｮ縺ｿ縺ｧ騾夂衍縺悟虚菴懊＠縺ｾ縺吶・
## 騾夂衍繝・・繝悶Ν縺ｮ謖吝虚

- `items.next_fire_at_primary` / `next_fire_at_strong`: 谺｡蝗樣夂衍莠亥ｮ壽凾蛻ｻ・・dge Function 縺梧峩譁ｰ・峨・- `items.## 髢狗匱繝｡繝｢

- Web Push: `supabase/functions/notify_dispatch/index.ts` 蜀・〒 `web-push` 繧貞茜逕ｨ縲・10/404 蠢懃ｭ疲凾縺ｯ繧ｵ繝悶せ繧ｯ繝ｪ繝励す繝ｧ繝ｳ繧定・蜍募炎髯､縲・- Email: 迴ｾ迥ｶ Resend API 繧貞茜逕ｨ縲ょ挨繝励Ο繝舌う繝縺ｸ蛻・ｊ譖ｿ縺医ｋ蝣ｴ蜷医・蜷後ヵ繧｡繧､繝ｫ縺ｮ `sendEmailNotification` 繧貞ｷｮ縺玲崛縺医※縺上□縺輔＞縲・- Cron 繧定ｪｿ謨ｴ縺吶ｋ蝣ｴ蜷医・ `notify_dispatch` 縺ｮ蜻ｼ縺ｳ蜃ｺ縺鈴ｻ蠎ｦ繧貞､画峩縺励※縺上□縺輔＞・亥・驛ｨ縺ｧ繧ｹ繧ｳ繧｢險育ｮ励→繧ｹ繝ｭ繝・ヨ隱ｿ謨ｴ繧定｡後≧縺溘ａ idempotent 縺ｫ蜍穂ｽ懊＠縺ｾ縺呻ｼ峨・
