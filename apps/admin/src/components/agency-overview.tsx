"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ArrowUpRight, Bot } from "lucide-react";
import { agencyAgents } from "@/lib/agency-agents";
import { Card, CardContent } from "@/components/ui/card";
export function AgencyOverview() {
 const { t }=useTranslation("agency");
 return <div className="flex-1 overflow-y-auto p-6 md:p-8"><div className="mb-8"><h1 className="text-2xl font-semibold tracking-tight">{t("team")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("chooseAgent")}</p></div>
 {[...new Set(agencyAgents.map(a=>a.group))].map(group=><section className="mb-8" key={group}><h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("groups."+group)}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{agencyAgents.filter(a=>a.group===group).map(agent=><Link href={"/agency/"+agent.id} key={agent.id} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring"><Card className="h-full rounded-xl transition-colors hover:border-primary/50"><CardContent className="flex items-center gap-4 p-5"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="size-5"/></span><div className="min-w-0 flex-1"><h3 className="font-medium">{agent.name}</h3><p className="text-sm text-muted-foreground">{t("roles."+agent.id)}</p></div><ArrowUpRight className="size-4 text-muted-foreground"/></CardContent></Card></Link>)}</div></section>)}</div>;
}
