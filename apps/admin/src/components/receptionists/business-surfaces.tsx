"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { LiveAppointmentsSurface } from "@/components/live-appointments-surface";
import { LiveCallsSurface } from "@/components/live-calls-surface";
import { LiveKnowledgeSurface } from "@/components/live-knowledge-surface";
import { LiveMessagesSurface } from "@/components/live-messages-surface";
import { LivePhoneNumberSettingsSurface } from "@/components/live-phone-number-settings-surface";
import { LiveServicesSurface } from "@/components/live-services-surface";
import { LiveWidgetSettingsSurface } from "@/components/live-widget-settings-surface";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { useNavigationSnapshot } from "@/components/navigation/navigation-provider";
import { requestJson } from "@/lib/request-json";
import { cn } from "@/lib/utils";
import { BusinessPage, SharedUsageNotice } from "./business-page";

/** One inbox for the business. This version keeps calls and chats in two tabs. */
export function InboxSurface() {
  const { t } = useTranslation("receptionists");
  const channel = useSearchParams().get("channel") === "chats" ? "chats" : "calls";
  return (
    <BusinessPage title={t("nav.inbox")}>
      <div className="flex flex-col gap-6">
        <nav aria-label={t("nav.inbox")} className="flex items-center gap-2">
          {(["calls", "chats"] as const).map((tab) => (
            <Link
              aria-current={channel === tab ? "page" : undefined}
              className={cn("inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors", channel === tab ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground")}
              href={`/inbox?channel=${tab}`}
              key={tab}
            >
              {t(`inbox.tabs.${tab}`)}
            </Link>
          ))}
        </nav>
        {channel === "calls" ? <LiveCallsSurface /> : <LiveMessagesSurface />}
      </div>
    </BusinessPage>
  );
}

/** The team members appointments can be booked with. */
export function StaffSurface() {
  const { t } = useTranslation("receptionists");
  const navigation = useNavigationSnapshot();
  const businessId = navigation?.businessId;
  const catalog = useQuery({ queryKey: ["catalog", businessId], enabled: Boolean(businessId), queryFn: () => requestJson<{ staff: Array<{ id: string; name: string; active: boolean }> }>(`/api/catalog?businessId=${encodeURIComponent(businessId!)}&limit=100`) });
  const staff = (catalog.data?.staff ?? []).filter((member) => member.active);
  return (
    <BusinessPage title={t("nav.staff")}>
      {catalog.isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : (
        <Surface className="flex flex-col">
          {staff.map((member) => (
            <Item className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0" key={member.id} variant="default">
              <ItemContent><ItemTitle className="ph-mask">{member.name}</ItemTitle></ItemContent>
            </Item>
          ))}
        </Surface>
      )}
    </BusinessPage>
  );
}

export function CalendarSurface() {
  const { t } = useTranslation("receptionists");
  return <BusinessPage title={t("nav.calendar")}><LiveAppointmentsSurface /></BusinessPage>;
}

export function ServicesSurface() {
  const { t } = useTranslation("receptionists");
  return <BusinessPage notice={<SharedUsageNotice kind="services" />} title={t("nav.services")}><LiveServicesSurface /></BusinessPage>;
}

export function KnowledgeSurface() {
  const { t } = useTranslation("receptionists");
  return <BusinessPage notice={<SharedUsageNotice kind="knowledge" />} title={t("nav.knowledge")}><LiveKnowledgeSurface /></BusinessPage>;
}

/** Numbers and the website widget, with which receptionist answers each. */
export function NumbersSurface() {
  const { t } = useTranslation("receptionists");
  return (
    <BusinessPage title={t("nav.numbers")}>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-sm leading-snug font-medium">{t("numbersPage.phoneTitle")}</h2>
          <LivePhoneNumberSettingsSurface />
        </section>
        <section className="flex flex-col gap-3" id="widget">
          <h2 className="font-heading text-sm leading-snug font-medium">{t("numbersPage.widgetTitle")}</h2>
          <LiveWidgetSettingsSurface />
        </section>
      </div>
    </BusinessPage>
  );
}
