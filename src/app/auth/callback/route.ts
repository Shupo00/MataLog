import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    const redirectUrl = buildLoginRedirect(request.url, nextPath);
    redirectUrl.searchParams.set("error", errorCode ?? error);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = createSupabaseRouteClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const redirectUrl = buildLoginRedirect(request.url, nextPath);
      redirectUrl.searchParams.set("error", "callback_error");
      redirectUrl.searchParams.set("error_description", exchangeError.message);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

function buildLoginRedirect(requestUrl: string, nextPath: string) {
  const loginUrl = new URL("/login", requestUrl);
  if (nextPath && nextPath !== "/") {
    loginUrl.searchParams.set("redirectedFrom", nextPath);
  }
  return loginUrl;
}


