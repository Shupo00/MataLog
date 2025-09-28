"use client";

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/lib/supabase/types";

export function createSupabaseBrowserClient() {
  return createBrowserSupabaseClient<Database>();
}

export type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;