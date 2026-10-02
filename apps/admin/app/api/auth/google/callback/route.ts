import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_PROOF = "agency_google_broker_proof";
const COOKIE_RETURN_TO = "agency_google_broker_return";
const COOKIE_LOCALE = "agency_google_broker_locale";

function cookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const item of raw.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) {
      try { return decodeURIComponent(parts.join("=")); } catch { return null; }
    }
  }
  return null;
}

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const parsed = new URL(value, "https://garage-martin.invalid");
    return parsed.origin === "https://garage-martin.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch {
    return "/";
  }
}

function clearFlowCookies(response: NextResponse, secure: boolean) {
  const options = { httpOnly: true, secure, sameSite: "lax" as const, path: "/api/auth/google/callback", maxAge: 0 };
  response.cookies.set(COOKIE_PROOF, "", options);
  response.cookies.set(COOKIE_RETURN_TO, "", options);
  response.cookies.set(COOKIE_LOCALE, "", options);
}

export async function GET(request: Request) {
  const baseUrl = process.env.APP_BASE_URL;
  const brokerUrl = process.env.OAUTH_BROKER_URL;
  const appId = process.env.OAUTH_BROKER_APP_ID;
  const environment = process.env.OAUTH_BROKER_ENVIRONMENT;
  const appKey = process.env.OAUTH_BROKER_APP_KEY;
  const expectedReturnUri = process.env.OAUTH_BROKER_RETURN_URI;
  const proof = cookieValue(request, COOKIE_PROOF);
  const locale = cookieValue(request, COOKIE_LOCALE) === "fr" ? "fr" : "en";
  const destination = safeReturnTo(cookieValue(request, COOKIE_RETURN_TO));
  const failure = () => {
    const response = NextResponse.redirect(new URL(`/${locale}/login?google=error`, baseUrl ?? request.url));
    clearFlowCookies(response, Boolean(baseUrl && new URL(baseUrl).protocol === "https:"));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };

  if (!baseUrl || !brokerUrl || !appId || !environment || !appKey || !expectedReturnUri || !proof) return failure();
  const url = new URL(request.url);
  const ticket = url.searchParams.get("broker_ticket");
  if (url.searchParams.has("error") || !ticket) return failure();

  try {
    const redeem = await fetch(new URL("/api/users/oauth/broker/redeem/", brokerUrl), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${appKey}` },
      body: JSON.stringify({ app_id: appId, environment, ticket, proof }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!redeem.ok) return failure();
    const payload = await redeem.json() as {
      app_id?: unknown;
      environment?: unknown;
      claims?: Record<string, unknown>;
    };
    const claims = payload.claims;
    if (
      payload.app_id !== appId || payload.environment !== environment ||
      !claims || !["accounts.google.com", "https://accounts.google.com"].includes(String(claims.iss)) ||
      typeof claims.sub !== "string" || !claims.sub ||
      typeof claims.email !== "string" || claims.email_verified !== true
    ) return failure();

    const sessionRequest = new Request(new URL("/api/auth/google-broker/session", baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-service-secret": process.env.INTERNAL_SERVICE_SECRET ?? "",
      },
      body: JSON.stringify({
        googleId: claims.sub,
        email: claims.email,
        ...(typeof claims.given_name === "string" || typeof claims.family_name === "string"
          ? { name: [claims.given_name, claims.family_name].filter((part): part is string => typeof part === "string" && part.length > 0).join(" ") }
          : {}),
        ...(typeof claims.picture === "string" ? { image: claims.picture } : {}),
      }),
    });
    const sessionResponse = await getAuth().handler(sessionRequest);
    if (!sessionResponse.ok) return failure();

    const response = NextResponse.redirect(new URL(destination, baseUrl));
    clearFlowCookies(response, new URL(baseUrl).protocol === "https:");
    for (const cookie of sessionResponse.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return failure();
  }
}
