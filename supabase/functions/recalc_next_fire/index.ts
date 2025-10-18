import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

interface ItemRow {
  id: string;
  user_id: string;
  cadence_days: number | null;
  notifications_enabled: boolean;
  notify_strong: boolean;
  threshold_primary: number;
  threshold_strong: number;
}

interface LogRow {
  at: string;
  satisfaction: number | null;
}

interface Payload {
  itemId?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Edge function missing SUPABASE_URL or SERVICE_ROLE_KEY env vars.");
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

  const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

  try {
    const payload = (await req.json()) as Payload;
    if (!payload.itemId) {
      return new Response(JSON.stringify({ error: "itemId is required" }), {
        status: 400,
        headers: corsHeaders(req.headers),
      });
    }

    const { data: item, error: itemError } = await supabase
      .from<ItemRow>("items")
      .select(
        "id, user_id, cadence_days, notifications_enabled, notify_strong, threshold_primary, threshold_strong"
      )
      .eq("id", payload.itemId)
      .single();

    if (itemError) {
      console.error("recalc_next_fire: failed to load item", itemError);
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: corsHeaders(req.headers),
      });
    }

    if (!item.notifications_enabled) {
      await clearSchedule(supabase, item.id);
      return new Response(JSON.stringify({ ok: true, reason: "notifications disabled" }), {
        status: 200,
        headers: corsHeaders(req.headers),
      });
    }

    const { data: lastLog, error: logError } = await supabase
      .from<LogRow>("logs")
      .select("at, satisfaction")
      .eq("item_id", item.id)
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) {
      console.error("recalc_next_fire: failed to load last log", logError);
    }

    if (!lastLog) {
      await clearSchedule(supabase, item.id);
      return new Response(JSON.stringify({ ok: true, reason: "no activity" }), {
        status: 200,
        headers: corsHeaders(req.headers),
      });
    }

    const sigmaDays = determineSigmaDays(item);
    const sigmaHours = sigmaDays * 24;
    const nextPrimary = computeNextFire(
      lastLog.at,
      sigmaHours,
      item.threshold_primary
    );
    const nextStrong = item.notify_strong
      ? computeNextFire(
          lastLog.at,
          sigmaHours,
          item.threshold_strong
        )
      : null;

    await supabase
      .from("items")
      .update({
        next_fire_at_primary: nextPrimary,
        next_fire_at_strong: nextStrong,
      })
      .eq("id", item.id);

    return new Response(
      JSON.stringify({ ok: true, nextPrimary, nextStrong, sigmaDays }),
      {
        status: 200,
        headers: corsHeaders(req.headers),
      }
    );
  } catch (error) {
    console.error("recalc_next_fire: unexpected error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: corsHeaders(req.headers),
    });
  }
});

function determineSigmaDays(item: ItemRow): number {
  const DEFAULT_CADENCE = 7;
  const MIN_CADENCE = 0.01; // ~15 minutes
  const stored = item.cadence_days;
  if (typeof stored !== "number" || Number.isNaN(stored) || stored <= 0) {
    return DEFAULT_CADENCE;
  }
  return Math.max(MIN_CADENCE, stored);
}

function computeNextFire(
  lastLoggedAt: string,
  sigmaHours: number,
  threshold: number
): string | null {
  if (!Number.isFinite(sigmaHours) || sigmaHours <= 0) return null;
  if (typeof threshold !== "number") return null;
  if (threshold <= 0 || threshold >= 100) return null;
  const normalized = clamp(threshold / 100, 0.0001, 0.99);
  const horizon = -sigmaHours * Math.log(1 - normalized);
  if (!Number.isFinite(horizon) || horizon <= 0) return null;

  const next = new Date(new Date(lastLoggedAt).getTime() + horizon * 3600 * 1000);
  return next.toISOString();
}

async function clearSchedule(supabase: ReturnType<typeof createClient>, itemId: string) {
  await supabase
    .from("items")
    .update({ next_fire_at_primary: null, next_fire_at_strong: null })
    .eq("id", itemId);
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












