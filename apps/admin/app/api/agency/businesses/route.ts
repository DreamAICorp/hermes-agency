import { NextResponse } from "next/server";
import { z } from "zod";
import { createBusiness } from "@lobbystack/domain";
import { asApiResponse, readJson, requireApiSession } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";

const inputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().max(80).refine(value => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }),
});
export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request);
    const parsed = inputSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Invalid agency details." }, { status: 400 });
    const created = await createBusiness(createDomainContext(), {
      userId: session.user.id,
      ...parsed.data,
      businessType: "agency",
      workspaceKind: "agency",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return asApiResponse(error); }
}
