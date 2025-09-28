import { cookies } from "next/headers";
import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/lib/supabase/types";

export function createSupabaseServerClient() {
  return createServerComponentClient<Database>({
    cookies,
  });
}

export function createSupabaseRouteClient() {
  return createRouteHandlerClient<Database>({
    cookies,
  });
}
