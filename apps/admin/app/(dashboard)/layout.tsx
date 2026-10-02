import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { listUserBusinesses } from "@lobbystack/domain";
import { RootDocument, appMetadata } from "@/app/root-document";
import { AgencyShell } from "@/components/agency-shell";
import { getSession } from "@/lib/auth";
import { getAppDatabase } from "@/lib/api-helpers";
import { localizePublicPath } from "@/lib/locale-path";
import { localeFromRequestHeaders, PATHNAME_HEADER } from "@/lib/locale-request";
import { routeNamespaces } from "@/lib/route-namespaces";
import "../globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = appMetadata;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const { locale, source } = localeFromRequestHeaders(requestHeaders);
  const session = await getSession(new Headers(requestHeaders));
  if (!session) redirect(localizePublicPath("/login", locale));
  const businesses = await listUserBusinesses(getAppDatabase().db, session.user.id);
  if (!businesses.length && requestHeaders.get(PATHNAME_HEADER) !== "/agency/create") redirect("/agency/create");
  return (
    <RootDocument locale={locale} localeSource={source} namespaces={routeNamespaces(requestHeaders.get(PATHNAME_HEADER) ?? "/")}>
      <AgencyShell
        user={{
          email: session.user.email ?? "",
          name: session.user.name ?? session.user.email ?? "",
        }}
      >
        {children}
      </AgencyShell>
    </RootDocument>
  );
}
