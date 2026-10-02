import { NextResponse } from "next/server";
import { agencyTenantIdentity } from "@/lib/agency-tenant-runtime";
import { asApiResponse } from "@/lib/api-helpers";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const businessId = url.searchParams.get("businessId") ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[0-9a-f-]{36}$/.test(businessId)) {
    return NextResponse.json({ error: "Connexion invalide." }, { status: 400 });
  }
  try {
    const identity = await agencyTenantIdentity(request, businessId);
    const endpoint = process.env.AGENCY_TENANT_COORDINATOR_URL;
    const key = process.env.AGENCY_TENANT_COORDINATOR_KEY;
    if (!endpoint || !key) return NextResponse.json({ error: "Connexion indisponible." }, { status: 503 });
    const upstream = await fetch(endpoint + "/standalone", {
      method: "POST", headers: { "content-type": "application/json", "x-agency-tenant-key": key },
      body: JSON.stringify({ ...identity, state }), cache: "no-store", signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Connexion à cette agence refusée. Réouvre sa WebUI." }, { status: upstream.status });
    const result = await upstream.json();
    const expected = "https://owv-" + identity.businessId.replaceAll("-", "") + ".dev.4u-corp.com";
    if (result.origin !== expected || result.businessId !== identity.businessId || !/^[A-Za-z0-9_-]{43}$/.test(result.ticket)) {
      return NextResponse.json({ error: "Destination de connexion invalide." }, { status: 502 });
    }
    const target = new URL("/sso/callback", expected);
    target.searchParams.set("ticket", result.ticket);
    const response = NextResponse.redirect(target, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      const start = new URL("/api/auth/google/start", process.env.APP_BASE_URL ?? request.url);
      start.searchParams.set("returnTo", url.pathname + url.search);
      return NextResponse.redirect(start, 303);
    }
    return asApiResponse(error);
  }
}
