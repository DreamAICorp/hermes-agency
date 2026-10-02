import "server-only";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { businesses, businessMemberships } from "@lobbystack/db";
import { withOperatorTransaction } from "@/lib/api-helpers";

export type AgencyTenantIdentity = {
  businessId: string;
  name: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
};

/** Called only after the operator transaction has verified tenant membership. */
export async function ensureAgencyTenant(identity: AgencyTenantIdentity) {
  const key = process.env.AGENCY_TENANT_COORDINATOR_KEY;
  const endpoint = process.env.AGENCY_TENANT_COORDINATOR_URL;
  if (!key || !endpoint) {
    return { status: 503, body: { error: "Le provisionnement des agences est indisponible." } };
  }
  const response = await fetch(endpoint + "/session", {
    method: "POST",
    headers: { "content-type": "application/json", "x-agency-tenant-key": key },
    body: JSON.stringify(identity),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (response.status === 202) return { status: 202, body: { state: "provisioning", retryAfter: 3 } };
  if (!response.ok) return { status: 503, body: { error: "La WebUI de cette entreprise n’a pas pu être démarrée. Réessaie dans un instant." } };
  const expected = "https://owv-" + identity.businessId.replaceAll("-", "") + ".dev.4u-corp.com";
  if (body.origin !== expected || typeof body.token !== "string" || body.businessId !== identity.businessId) {
    return { status: 502, body: { error: "La connexion à cette entreprise n’a pas pu être vérifiée." } };
  }
  return { status: 200, body: { origin: expected, token: body.token, businessId: identity.businessId } };
}


/** Identity comes from Better Auth; company membership comes from the RLS transaction. */
export async function agencyTenantIdentity(request: Request, companyId?: string): Promise<AgencyTenantIdentity> {
  let scopedRequest = request;
  if (companyId) {
    const url = new URL(request.url);
    url.searchParams.set("businessId", companyId);
    scopedRequest = new Request(url, { headers: request.headers });
  }
  return withOperatorTransaction(scopedRequest, async ({ session, businessId, tx }) => {
    const user = session.user;
    const [company] = await tx.select({ name: businesses.name, status: businesses.status })
      .from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const [member] = await tx.select({ role: businessMemberships.role }).from(businessMemberships)
      .where(and(eq(businessMemberships.businessId, businessId), eq(businessMemberships.userId, session.user.id),
        eq(businessMemberships.status, "active"))).limit(1);
    if (!user.emailVerified || typeof user.email !== "string" || !company || company.status !== "active" || !member) {
      throw NextResponse.json({ error: "Cette entreprise est inaccessible ou votre adresse doit être vérifiée." }, { status: 403 });
    }
    return { email: user.email, businessId, name: company.name, userId: session.user.id,
      userName: user.name ?? user.email, role: member.role };
  });
}
