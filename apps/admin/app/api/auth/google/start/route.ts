import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_PROOF = "agency_google_broker_proof";
const COOKIE_RETURN_TO = "agency_google_broker_return";
const COOKIE_LOCALE = "agency_google_broker_locale";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const parsed = new URL(value, "https://garage-martin.invalid");
    return parsed.origin === "https://garage-martin.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch {
    return "/";
  }
}

export async function GET(request: Request) {
  const baseUrl = process.env.APP_BASE_URL;
  const brokerUrl = process.env.OAUTH_BROKER_URL;
  const appId = process.env.OAUTH_BROKER_APP_ID;
  const environment = process.env.OAUTH_BROKER_ENVIRONMENT;
  const returnUri = process.env.OAUTH_BROKER_RETURN_URI;
  if (!baseUrl || !brokerUrl || !appId || !environment || !returnUri) {
    return NextResponse.json({ error: "Google broker sign-in is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const proof = randomBytes(32).toString("base64url");
  const proofHash = createHash("sha256").update(proof).digest("hex");
  const locale = url.searchParams.get("locale") === "fr" ? "fr" : "en";
  const destination = safeReturnTo(url.searchParams.get("returnTo"));
  const target = new URL("/api/users/oauth/broker/start/", brokerUrl);
  target.search = new URLSearchParams({
    app_id: appId,
    environment,
    return_uri: returnUri,
    proof_hash: proofHash,
  }).toString();

  const response = NextResponse.redirect(target);
  const common = { httpOnly: true, secure: new URL(baseUrl).protocol === "https:", sameSite: "lax" as const, path: "/api/auth/google/callback", maxAge: 300 };
  response.cookies.set(COOKIE_PROOF, proof, common);
  response.cookies.set(COOKIE_RETURN_TO, destination, common);
  response.cookies.set(COOKIE_LOCALE, locale, common);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
