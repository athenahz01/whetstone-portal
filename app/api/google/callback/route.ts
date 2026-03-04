import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  const siteUrl = request.nextUrl.origin;
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    console.error("Token exchange failed:", tokens);
    return NextResponse.redirect(new URL("/?error=token_failed", request.url));
  }

  // Get the user's Supabase session from cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // We need to pass the profile_id via a cookie or state param
  // For simplicity, we'll use the state parameter
  const state = request.nextUrl.searchParams.get("state");

  if (!state) {
    return NextResponse.redirect(new URL("/?error=no_state", request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Upsert the token
  const { error } = await supabase
    .from("google_tokens")
    .upsert({
      profile_id: state,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      expires_at: expiresAt,
    }, { onConflict: "profile_id" });

  if (error) {
    console.error("Error saving token:", error);
    return NextResponse.redirect(new URL("/?error=save_failed", request.url));
  }

  return NextResponse.redirect(new URL("/?gcal=connected", request.url));
}