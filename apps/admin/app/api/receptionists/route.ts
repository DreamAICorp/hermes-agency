import { NextResponse } from "next/server";

import { getSharedItemUsage, listReceptionistRoutes, listReceptionists } from "@lobbystack/domain";
import { asApiResponse, withOperatorTransaction } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";

export const dynamic = "force-dynamic";

/**
 * The business's receptionists with the numbers and widget keys that route to
 * each, and who uses which shared knowledge item and service.
 */
export async function GET(request: Request) {
  try {
    return NextResponse.json(await withOperatorTransaction(request, async ({ session, businessId }) => {
      const context = createDomainContext();
      const input = { userId: session.user.id, businessId };
      const [receptionists, routes, usage] = await Promise.all([
        listReceptionists(context, input),
        listReceptionistRoutes(context, input),
        getSharedItemUsage(context, input),
      ]);
      return { receptionists, routes, usage };
    }));
  } catch (error) {
    return asApiResponse(error);
  }
}
