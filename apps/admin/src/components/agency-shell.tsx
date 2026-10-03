"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, ExternalLink, Settings2, Building2 } from "lucide-react";
import { AgencyAgentWindow } from "@/components/agency-agent-window";
import { useAgencyWorkspaces } from "@/lib/agency-workspaces";
import { AgencyOverview } from "@/components/agency-overview";
import { agencyAgents, findAgencyAgent } from "@/lib/agency-agents";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { NavUser } from "@/components/nav-user";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AgencyShell({children,user}:{children:React.ReactNode;user:{name:string;email:string}}) {
 const { t }=useTranslation("agency");
 const pathname=usePathname();
 const workspaces=useAgencyWorkspaces();
 const businessId=workspaces.data?.businesses.find(business=>business.active)?.businessId;
 const agencyView=pathname==="/" || (pathname.startsWith("/agency/")&&pathname!=="/agency/create");
 const routeAgent=findAgencyAgent(pathname.split("/agency/")[1] || "sona") || agencyAgents[0];
 const selectionContext=businessId+":"+routeAgent?.id;
 const [embeddedSelection,setEmbeddedSelection]=useState<{context:string;agentId:string}|null>(null);
 const selectedAgent=(embeddedSelection?.context===selectionContext?findAgencyAgent(embeddedSelection.agentId):null) || routeAgent;
 const selectEmbeddedAgent=useCallback((agentId:string)=>setEmbeddedSelection(current=>current?.context===selectionContext&&current.agentId===agentId?current:{context:selectionContext,agentId}),[selectionContext]);
 const applications=[{href:"/",label:t("overview"),icon:LayoutDashboard},{href:"/agency/sona",label:"Agency",icon:Building2},{href:"https://hermes.dev.4u-corp.com/",label:t("customWebui"),icon:ExternalLink},{href:"https://hermes-webui.dev.4u-corp.com/",label:t("hermesWebui"),icon:Bot},{href:"https://hermes-admin.dev.4u-corp.com/",label:t("hermesAdmin"),icon:Settings2}];
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>setExpanded(false),[pathname]);
 const [mode,setMode]=useState<"full"|"labels"|"icons">("full");
 useEffect(()=>{const saved=localStorage.getItem("agency:sidebar-mode");if(saved==="full"||saved==="labels"||saved==="icons")setMode(saved);},[]);
 const cycle=()=>setMode(current=>{const next=current==="full"?"labels":current==="labels"?"icons":"full";localStorage.setItem("agency:sidebar-mode",next);return next;});
 const labelled=mode==="labels";
 const menuClass=labelled?"h-auto min-h-16 flex-col justify-center gap-1 px-1 py-2 text-center [&>span:last-child]:whitespace-normal! [&>span:last-child]:overflow-visible! [&>span:last-child]:text-clip!":"";
 const textClass=labelled?"block w-full whitespace-normal text-center text-[10px] leading-3":"";

 const groups=[...new Set(agencyAgents.map(agent=>agent.group))];
 return <TooltipProvider delay={100}><SidebarProvider open={mode!=="icons"} onOpenChange={cycle} data-agency-sidebar-mode={mode} className="h-svh min-h-0 min-w-0 flex-1 overflow-hidden" style={{"--sidebar-width":labelled?"6rem":"17rem"} as React.CSSProperties}><nav aria-label={t("applications")} data-global-navigation className="z-30 flex w-14 shrink-0 flex-col items-center gap-3 border-r bg-sidebar px-1 py-3"><Link href="/" className="mb-3 rounded-xl px-2 py-2 font-semibold" aria-label="4U Corp">4U</Link><div data-global-tenant className="mb-3 w-full"><WorkspaceSwitcher compact createHref="/agency/create" createLabel={t("createAgency")}/></div>{applications.map(item=><Tooltip key={item.href}><TooltipTrigger render={<Link href={item.href} aria-label={item.label} title={item.label} className={"flex size-10 items-center justify-center rounded-xl "+((item.label==="Agency"&&agencyView)?"bg-primary/10 text-primary":"text-muted-foreground hover:bg-sidebar-accent")} />}><item.icon className="size-5"/></TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>)}<div data-global-account className="mt-auto w-full"><NavUser compact showAccountSettings={false} user={{...user,avatar:""}} onSignOut={async()=>{await fetch("/api/auth/sign-out",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});window.location.href="/fr/login";}}/></div></nav>
  <Sidebar collapsible="icon" className="left-14!" >
   <SidebarHeader><Link href="/" aria-label={t("title")} title={t("title")} className="block overflow-hidden px-2 py-3 text-center font-semibold tracking-tight">{mode==="full"?t("title"):"H"}</Link></SidebarHeader>
   <SidebarContent>
    <SidebarGroup><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip={t("overview")} title={t("overview")} aria-label={t("overview")} className={menuClass} render={<Link href="/" />} isActive={pathname==="/"}><LayoutDashboard/><span className={textClass}>{t("overview")}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup>
    {groups.map(group=><SidebarGroup key={group}><SidebarGroupLabel className={mode!=="full"?"hidden":""}>{t("groups."+group)}</SidebarGroupLabel><SidebarMenu>{agencyAgents.filter(agent=>agent.group===group).map(agent=><SidebarMenuItem key={agent.id}><SidebarMenuButton tooltip={agent.name+" · "+t("roles."+agent.id)} title={agent.name+" · "+t("roles."+agent.id)} aria-label={agent.name} render={<Link href={"/agency/"+agent.id} onClick={()=>setEmbeddedSelection(null)}/>} isActive={agencyView&&selectedAgent?.id===agent.id} className={labelled?menuClass:"h-auto min-h-12 py-2"}><Bot/><span className={labelled?textClass:"min-w-0"}><span className="block font-medium">{agent.name}</span>{mode==="full"&&<span className="block truncate text-xs text-muted-foreground">{t("roles."+agent.id)}</span>}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup>)}

   </SidebarContent>

  </Sidebar>
  <SidebarInset className="min-h-0 overflow-hidden"><header className="flex h-14 shrink-0 items-center gap-3 border-b px-4"><SidebarTrigger title={t("cycleNavigation")} aria-label={t("cycleNavigation")}/><span className="text-sm text-muted-foreground">Agency</span></header><main id="dashboard-main-content" className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{agencyView?<><section data-agency-content className={expanded?"hidden":"hidden min-w-0 flex-1 flex-col overflow-hidden lg:flex"}>{pathname==="/"?children:<AgencyOverview/>}</section>{selectedAgent&&routeAgent&&businessId&&<aside data-agent-panel aria-label={t("agentSpace",{name:selectedAgent.name})} className={expanded?"flex min-h-0 min-w-0 flex-1 flex-col border-l bg-background":"flex min-h-0 w-full min-w-0 flex-col border-l bg-background lg:w-[42%] lg:min-w-[360px] xl:w-[38%]"}><AgencyAgentWindow key={businessId+":"+routeAgent.id} agent={routeAgent} activeAgent={selectedAgent} onActiveAgentChange={selectEmbeddedAgent} businessId={businessId} expanded={expanded} onToggleExpanded={()=>setExpanded(v=>!v)}/></aside>}</>:<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>}</main></SidebarInset>
 </SidebarProvider></TooltipProvider>;
}
