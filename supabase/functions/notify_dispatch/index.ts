import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import webpush from "npm:web-push@3.5.0";

type NotificationLevel = "primary" | "strong";

type DatabaseClient = ReturnType<typeof createClient>;

interface ItemRow {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  category: string;
  cadence_days: number | null;
  notifications_enabled: boolean;
  notify_web_push: boolean;
  notify_email: boolean;
  notify_strong: boolean;
  threshold_primary: number;
  threshold_strong: number;
  next_fire_at_primary: string | null;
  next_fire_at_strong: string | null;
}

interface LogRow {
  at: string;
  satisfaction: number | null;
}

interface ProfileRow {
  display_name: string | null;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_success_at: string | null;
  is_active: boolean;
}

interface PreferencesRow {
  primary_threshold_default: number;
  strong_threshold_default: number;
  notify_hour_start: number;
  notify_hour_end: number;
  dnd_start: string | null;
  dnd_end: string | null;
  weekly_digest_weekday: number | null;
  timezone: string;
  notify_channel: "webpush" | "email" | "both";
}

interface ServePayload {
  dryRun?: boolean;
  now?: string;
}

interface NotificationSummary {
  successes: number;
  attempts: number;
  skipped: number;
  eventsProcessed: number;
  details: Array<{
    itemId: string;
    level: NotificationLevel;
    channels: string[];
    success: boolean;
    reason?: string;
  }>;
}

interface UserContext {
  email: string;
  displayName: string | null;
  preferences: PreferencesRow | null;
  pushSubscriptions: PushSubscriptionRow[];
}

interface RiiMetrics {
  score: number;
  sigmaDays: number;
  hoursSinceLast: number;
  noveltyFactor: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://app.matalog.local").replace(/\/$/, "");

const VAPID_PUBLIC_KEY = Deno.env.get("PUSH_VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("PUSH_VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("PUSH_VAPID_SUBJECT") ?? "";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "";

const WEB_PUSH_READY = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (WEB_PUSH_READY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("notify_dispatch: Web Push disabled (missing VAPID env vars)");
}

if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
  console.warn("notify_dispatch: Email dispatch disabled (missing Resend env vars)");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req.headers) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders(req.headers),
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = req.body ? (await req.json()) as ServePayload : {};
    const now = body.now ? new Date(body.now) : new Date();
    if (Number.isNaN(now.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid now parameter" }), {
        status: 400,
        headers: corsHeaders(req.headers),
      });
    }

    const summary: NotificationSummary = {
      successes: 0,
      attempts: 0,
      skipped: 0,
      eventsProcessed: 0,
      details: [],
    };

    const dueEvents = await loadDueEvents(supabase, now.toISOString());
    if (dueEvents.length === 0) {
      return new Response(JSON.stringify({ ok: true, summary }), {
        status: 200,
        headers: corsHeaders(req.headers),
      });
    }

    const userCache = new Map<string, UserContext | null>();

    for (const event of dueEvents) {
      summary.eventsProcessed += 1;

      if (!event.item.notifications_enabled) {
        summary.skipped += 1;
        summary.details.push({
          itemId: event.item.id,
          level: event.level,
          channels: [],
          success: false,
          reason: "notifications-disabled",
        });
        continue;
      }

      const userContext = await getUserContext(supabase, event.item.user_id, userCache);
      if (!userContext) {
        summary.skipped += 1;
        summary.details.push({
          itemId: event.item.id,
          level: event.level,
          channels: [],
          success: false,
          reason: "missing-user-context",
        });
        continue;
      }

      const logs = await loadRecentLogs(supabase, event.item.id);
      if (logs.length === 0) {
        await updateItemSchedule(supabase, event.item.id, event.level, null);
        summary.skipped += 1;
        summary.details.push({
          itemId: event.item.id,
          level: event.level,
          channels: [],
          success: false,
          reason: "no-logs",
        });
        continue;
      }

      const metrics = computeRiiMetrics(event.item, logs, now);
      const message = buildNotificationMessage(event.item, metrics, event.level);
      const deeplink = `${APP_URL}/items/${event.item.id}`;
        const preference = userContext.preferences?.notify_channel ?? "both";
        const allowWebPush = preference === "webpush" || preference === "both";
        const allowEmail = preference === "email" || preference === "both";

      const attemptedChannels: string[] = [];
      const successfulChannels: string[] = [];

      if (!body.dryRun && allowWebPush && event.item.notify_web_push && userContext.pushSubscriptions.length > 0) {
        const pushResult = await sendWebPushNotifications(supabase, userContext.pushSubscriptions, {
          title: message.title,
          body: message.body,
          url: deeplink,
          itemId: event.item.id,
          level: event.level,
          score: metrics.score,
        });

        if (pushResult.attempted) {
          attemptedChannels.push("webpush");
          summary.attempts += 1;
        }

        if (pushResult.success) {
          successfulChannels.push("webpush");
          summary.successes += 1;
          await recordNotification(supabase, event.item.id, event.item.user_id, "webpush", event.level, metrics.score, now.toISOString(), true, {
            title: message.title,
            body: message.body,
          });
        }
      }

      if (!body.dryRun && allowEmail && event.item.notify_email && userContext.email) {
        const emailResult = await sendEmailNotification(
          userContext.email,
          userContext.displayName,
          message,
          metrics,
          deeplink,
          event.level,
          event.item.name
        );

        if (emailResult.attempted) {
          attemptedChannels.push("email");
          summary.attempts += 1;
        }

        if (emailResult.success) {
          successfulChannels.push("email");
          summary.successes += 1;
          await recordNotification(supabase, event.item.id, event.item.user_id, "email", event.level, metrics.score, now.toISOString(), true, {
            subject: emailResult.subject,
          });
        }
      }

      await updateItemSchedule(supabase, event.item.id, event.level, null);

      summary.details.push({
        itemId: event.item.id,
        level: event.level,
        channels: attemptedChannels,
        success: successfulChannels.length > 0,
        reason: successfulChannels.length > 0 ? undefined : "dispatch-failed",
      });
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200,
      headers: corsHeaders(req.headers),
    });
  } catch (error) {
    console.error("notify_dispatch: unexpected error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: corsHeaders(req.headers),
    });
  }
});

function buildNotificationMessage(item: ItemRow, metrics: RiiMetrics, level: NotificationLevel) {
  const elapsed = formatElapsed(metrics.hoursSinceLast);
  const title = level === "strong"
    ? `Don't miss the peak - ${item.name}`
    : `Sweet spot for ${item.name}`;
  const body = level === "strong"
    ? `Score ${metrics.score} (high). It's the peak window - enjoy it now.`
    : `It's been ${elapsed}. Score ${metrics.score}. Great moment to revisit.`;

  return { title, body, elapsed };
}

function formatElapsed(hours: number): string {
  const totalMinutes = Math.max(1, Math.round(hours * 60));
  if (totalMinutes >= 24 * 60) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingHours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    if (remainingHours > 0) return `${days}d ${remainingHours}h`;
    return `${days}d`;
  }
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes - h * 60;
    if (minutes > 0) return `${h}h ${minutes}m`;
    return `${h}h`;
  }
  return `${totalMinutes}m`;
}

function computeRiiMetrics(item: ItemRow, logs: LogRow[], now: Date): RiiMetrics {
  const lastLog = logs[0];
  const lastDate = new Date(lastLog.at);
  const hoursSinceLast = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60));
  const sigmaDays = determineSigmaDays(item);
  const sigmaHours = sigmaDays * 24;

  const base = sigmaHours > 0 ? 1 - Math.exp(-hoursSinceLast / sigmaHours) : 1;
  const noveltyFactor = computeNoveltyFactor(logs, sigmaHours);
  const score = clamp(Math.round(100 * base * noveltyFactor), 0, 100);

  return { score, sigmaDays, hoursSinceLast, noveltyFactor };
}

function determineSigmaDays(item: ItemRow): number {
  const DEFAULT_CADENCE = 7;
  return Math.max(0.5, item.cadence_days ?? DEFAULT_CADENCE);
}

function computeNoveltyFactor(logs: LogRow[], sigmaHours: number): number {
  if (logs.length < 3) return 1;
  const recent = logs.slice(0, 3);
  const diffs: number[] = [];
  for (let i = 0; i < recent.length - 1; i += 1) {
    const current = new Date(recent[i].at);
    const next = new Date(recent[i + 1].at);
    diffs.push(Math.abs(current.getTime() - next.getTime()) / (1000 * 60 * 60));
  }
  const avgGap = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : sigmaHours;
    if (avgGap < sigmaHours / 3) return 0.8;
  if (avgGap < sigmaHours / 2) return 0.9;
  return 1;
}

async function loadDueEvents(supabase: DatabaseClient, nowIso: string) {
  const { data, error } = await supabase
    .from<ItemRow>("items")
    .select("*")
    .or(
      `and(next_fire_at_primary.not.is.null,next_fire_at_primary.lte.${nowIso}),and(next_fire_at_strong.not.is.null,next_fire_at_strong.lte.${nowIso})`
    );

  if (error || !data) {
    console.error("notify_dispatch: failed to load items", error);
    return [] as Array<{ item: ItemRow; level: NotificationLevel }>;
  }

  const events: Array<{ item: ItemRow; level: NotificationLevel }> = [];

  for (const item of data) {
    if (item.next_fire_at_primary && item.next_fire_at_primary <= nowIso) {
      events.push({ item, level: "primary" });
    }
    if (item.notify_strong && item.next_fire_at_strong && item.next_fire_at_strong <= nowIso) {
      events.push({ item, level: "strong" });
    }
  }

  return events;
}

async function getUserContext(
  supabase: DatabaseClient,
  userId: string,
  cache: Map<string, UserContext | null>
): Promise<UserContext | null> {
  if (cache.has(userId)) {
    return cache.get(userId) ?? null;
  }

  const [profileResult, preferencesResult, pushResult, userResult] = await Promise.all([
    supabase.from<ProfileRow>("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from<PreferencesRow>("preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from<PushSubscriptionRow>("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_agent, last_success_at, is_active")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase.auth.admin.getUserById(userId),
  ]);

  if (profileResult.error) {
    console.error("notify_dispatch: profile lookup error", profileResult.error);
  }
  if (preferencesResult.error) {
    console.error("notify_dispatch: preferences lookup error", preferencesResult.error);
  }
  if (pushResult.error) {
    console.error("notify_dispatch: push subscription lookup error", pushResult.error);
  }

  const { data: userData, error: userError } = userResult;
  if (userError || !userData?.user) {
    console.error("notify_dispatch: user lookup error", userError);
    cache.set(userId, null);
    return null;
  }

  const context: UserContext = {
    email: userData.user.email ?? "",
    displayName: profileResult.data?.display_name ?? null,
    preferences: preferencesResult.data ?? null,
    pushSubscriptions: pushResult.data ?? [],
  };

  cache.set(userId, context);
  return context;
}


async function loadRecentLogs(supabase: DatabaseClient, itemId: string) {
  const { data, error } = await supabase
    .from<LogRow>("logs")
    .select("at, satisfaction")
    .eq("item_id", itemId)
    .order("at", { ascending: false })
    .limit(5);

  if (error || !data) {
    console.error("notify_dispatch: failed to load logs", error);
    return [] as LogRow[];
  }

  return data;
}

async function sendWebPushNotifications(
  supabase: DatabaseClient,
  subscriptions: PushSubscriptionRow[],
  payload: { title: string; body: string; url: string; itemId: string; level: NotificationLevel; score: number }
): Promise<{ attempted: boolean; success: boolean }> {
  if (!WEB_PUSH_READY || subscriptions.length === 0) {
    return { attempted: false, success: false };
  }

  let attempted = false;
  let success = false;
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: {
      url: payload.url,
      itemId: payload.itemId,
      level: payload.level,
      score: payload.score,
    },
  });

  const nowIso = new Date().toISOString();

  for (const sub of subscriptions) {
    attempted = true;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        body,
        { TTL: 3600 }
      );
      success = true;
      await supabase
          .from("push_subscriptions")
          .update({ last_success_at: nowIso, is_active: true })
          .eq("id", sub.id);
    } catch (error) {
      console.error("notify_dispatch: web push error", error);
      const statusCode = (error as { statusCode?: number }).statusCode ?? 0;
      if (statusCode === 404 || statusCode === 410) {
        await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
      }
    }
  }

  return { attempted, success };
}

async function sendEmailNotification(
  email: string,
  displayName: string | null,
  message: { title: string; body: string; elapsed: string },
  metrics: RiiMetrics,
  deeplink: string,
  level: NotificationLevel,
  itemName: string
): Promise<{ attempted: boolean; success: boolean; subject: string }> {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !email) {
    return { attempted: false, success: false, subject: "" };
  }

  const subjectPrefix = level === "strong" ? "ピークタイミング" : "ベストタイミング";
  const subject = `${subjectPrefix}：${itemName} (${metrics.score})`;
  const salutation = displayName ? `${displayName} さんへ` : "こんにちは";

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a;">
      <p>${salutation}</p>
      <p>最後に「${itemName}」を楽しんでから ${message.elapsed} が経ちました。</p>
      <p>現在のスコアは <strong>${metrics.score}</strong> です。今が良いタイミングかもしれません。</p>
      <p><a href="${deeplink}" style="color: #10b981; text-decoration: none; font-weight: 600;">アプリを開く</a></p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("notify_dispatch: email send error", response.status, text);
    return { attempted: true, success: false, subject };
  }

  return { attempted: true, success: true, subject };
}

async function updateItemSchedule(
  supabase: DatabaseClient,
  itemId: string,
  level: NotificationLevel,
  nextFire: string | null
) {
  const payload: Record<string, string | null> = {};
  if (level === "primary") {
    payload.next_fire_at_primary = nextFire;
  } else {
    payload.next_fire_at_strong = nextFire;
  }

  await supabase.from("items").update(payload).eq("id", itemId);
}

async function recordNotification(
  supabase: DatabaseClient,
  itemId: string,
  userId: string,
  channel: "webpush" | "email",
  level: NotificationLevel,
  score: number,
  sendAt: string,
  delivered: boolean,
  payload: Record<string, unknown>
) {
  await supabase.from("notifications").insert({
    item_id: itemId,
    user_id: userId,
    channel,
    level,
    score,
    send_at: sendAt,
    delivered,
    delivered_at: delivered ? sendAt : null,
    payload,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function corsHeaders(requestHeaders: Headers) {
  const origin = requestHeaders.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  };
}









