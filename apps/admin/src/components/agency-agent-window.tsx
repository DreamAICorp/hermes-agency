"use client";
import { useTranslation } from "react-i18next";
import { useEffect,useRef,useState } from "react";
import { ExternalLink, PanelRight, Maximize2 } from "lucide-react";
import type { AgencyAgent } from "@/lib/agency-agents";
export function AgencyAgentWindow({agent,expanded=false,onToggleExpanded}:{agent:AgencyAgent;expanded?:boolean;onToggleExpanded?:()=>void}) {
 const { t }=useTranslation("agency");
 const frame=useRef<HTMLIFrameElement>(null);
 const [error,setError]=useState(""),[embed,setEmbed]=useState<{origin:string;token:string}|null>(null);
 useEffect(()=>{let active=true;setEmbed(null);setError("");
  fetch("/api/agency/embed?agent="+encodeURIComponent(agent.id),{cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||t("unavailable"));if(active)setEmbed(body);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};
 },[agent.id]);
 useEffect(()=>{
  const ready=(event:MessageEvent)=>{if(embed && event.origin===embed.origin && event.source===frame.current?.contentWindow && event.data?.type==="hermes-embed-ready") frame.current.contentWindow?.postMessage({type:"4u-hermes-embed-auth",token:embed.token,agentId:agent.id},embed.origin);};
  window.addEventListener("message",ready);return()=>window.removeEventListener("message",ready);
 },[embed,agent.id]);
 const authenticate=()=>{if(embed)frame.current?.contentWindow?.postMessage({type:"4u-hermes-embed-auth",token:embed.token,agentId:agent.id},embed.origin);};
 return <div className="flex min-h-0 flex-1 flex-col"><header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><h1 className="font-semibold">{agent.name}</h1><p className="text-xs text-muted-foreground">{t("roles."+agent.id)}</p></div><div className="flex items-center gap-2"><button className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" onClick={onToggleExpanded}>{expanded?<PanelRight className="size-4"/>:<Maximize2 className="size-4"/>}{expanded?t("panel"):t("fullScreen")}</button>{embed&&<a href={embed.origin+"/?agent="+agent.id} target="_blank" rel="noreferrer" aria-label={t("openWebui")} className="rounded-xl border p-2"><ExternalLink className="size-4"/></a>}</div></header>
 {error?<p role="alert" className="p-6 text-destructive">{error}</p>:<div className="flex min-h-0 flex-1"><section aria-label={t("agentSpace",{name:agent.name})} className="min-w-0 flex-1">{embed?<iframe ref={frame} title={"Open WebUI · "+agent.name} src={embed.origin+"/?agent="+encodeURIComponent(agent.id)+"&cockpit=1"} onLoad={authenticate} className="h-full w-full border-0" allow="microphone; clipboard-write"/>:<p role="status" className="p-6 text-sm text-muted-foreground">{t("opening")}</p>}</section></div>}
 </div>;
}
