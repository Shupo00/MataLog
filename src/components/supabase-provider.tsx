"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SupabaseProviderProps {
  children: React.ReactNode;
  initialSession: Session | null;
}

export default function SupabaseProvider({ children, initialSession }: SupabaseProviderProps) {
  const [supabaseClient] = useState(() => createSupabaseBrowserClient());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedClient = supabaseClient as unknown as SupabaseClient<any, "public", "public", any, any>;

  return (
    <SessionContextProvider supabaseClient={typedClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}