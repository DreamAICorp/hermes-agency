import { createHash, randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { accounts, agents, businesses, createDatabaseClient, knowledgeSnippets, phoneNumbers, services, users, widgetKeys } from "@lobbystack/db";
import { createBusiness, createReceptionist } from "@lobbystack/domain";

import { hashReplacementPassword } from "../../src/lib/password";

// Test operators for the navigation specs and manual checks on a local
// database. They use example.test addresses and a fixed test password.
export const NAVIGATION_TEST_PASSWORD = "Navigation-Test-Password-123!";

export type NavigationOperator = { userId: string; businessId: string; email: string; receptionistIds: string[]; phoneNumberId: string; widgetKeyId: string };

function requireLocalDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) throw new Error("A local database URL is required to seed navigation operators.");
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Navigation operators can only be seeded into a local database.");
  return databaseUrl;
}

/**
 * Creates a verified owner with a finished business, the way signup and
 * onboarding leave it, plus a few shared services, knowledge, a phone number
 * and a widget key. `receptionists` adds receptionists after the default one.
 */
export async function seedNavigationOperator(input: {
  databaseUrl: string | undefined;
  email?: string;
  businessName?: string;
  locale?: "en" | "fr";
  newNavigation?: boolean;
  staffEnabled?: boolean;
  receptionists?: string[];
}): Promise<NavigationOperator> {
  const database = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: requireLocalDatabase(input.databaseUrl) });
  const context = { db: database.db };
  try {
    const userId = randomUUID();
    const email = input.email ?? `nav-${userId.slice(0, 8)}@example.test`;
    await database.db.insert(users).values({ id: userId, email, normalizedEmail: email.toLowerCase(), emailVerified: true, name: "Nav Owner", preferredLocale: input.locale ?? "en" });
    await database.db.insert(accounts).values({ userId, providerId: "credential", accountId: userId, password: await hashReplacementPassword(NAVIGATION_TEST_PASSWORD) });
    const { businessId } = await createBusiness(context, { userId, name: input.businessName ?? "Maple Dental", timezone: "America/Toronto", businessType: "clinic", deploymentMode: "self_hosted_standard" });
    await database.db.update(businesses).set({
      onboardingStage: "complete",
      defaultLocale: input.locale ?? "en",
      staffEnabled: input.staffEnabled ?? false,
      featureFlags: input.newNavigation === false ? {} : { new_navigation: true },
      setupGuideSkippedSteps: ["fullScan", "sources", "testCall", "phoneNumber"],
    }).where(eq(businesses.id, businessId));
    await database.db.insert(services).values([
      { businessId, name: "Cleaning", slug: "cleaning", durationMinutes: 30 },
      { businessId, name: "Whitening", slug: "whitening", durationMinutes: 60 },
    ]);
    await database.db.insert(knowledgeSnippets).values([
      { businessId, title: "Parking", content: "Free parking behind the building." },
      { businessId, title: "Payment", content: "We take debit and credit cards." },
    ]);
    const [number] = await database.db.insert(phoneNumbers).values({ businessId, e164: `+1555${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}` }).returning({ id: phoneNumbers.id });
    const [key] = await database.db.insert(widgetKeys).values({ businessId, keyHash: createHash("sha256").update(randomUUID()).digest("hex"), label: "Main website" }).returning({ id: widgetKeys.id });
    for (const name of input.receptionists ?? []) await createReceptionist(context, { userId, businessId, name });
    const rows = await database.db.select({ id: agents.id }).from(agents).where(and(eq(agents.businessId, businessId), sql`${agents.archivedAt} is null`)).orderBy(sql`${agents.isDefault} desc`, agents.createdAt);
    await database.db.update(users).set({ activeBusinessId: businessId }).where(eq(users.id, userId));
    return { userId, businessId, email, receptionistIds: rows.map((row) => row.id), phoneNumberId: number!.id, widgetKeyId: key!.id };
  } finally {
    await database.pool.end();
  }
}

/** Removes a seeded operator and everything their business owns. */
export async function removeNavigationOperator(databaseUrl: string | undefined, operator: Pick<NavigationOperator, "userId" | "businessId">): Promise<void> {
  const database = createDatabaseClient("lobbystack_migrator", { DATABASE_URL: requireLocalDatabase(databaseUrl) });
  try {
    await database.db.execute(sql`delete from public.businesses where id = ${operator.businessId}::uuid`);
    await database.db.execute(sql`delete from public.users where id = ${operator.userId}::uuid`);
  } finally {
    await database.pool.end();
  }
}
