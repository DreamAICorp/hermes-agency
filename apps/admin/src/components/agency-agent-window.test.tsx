// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { findAgencyAgent } from "@/lib/agency-agents";
import { AgencyAgentWindow } from "./agency-agent-window";
const t = (key: string) => key;
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t }) }));
const agent={id:"sona",name:"Sona",role:"Supervision entreprise",group:"Direction",kind:"persistent_profile"} as const;
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("company-scoped embedded chat",()=>{
 it("discards a previous company's late token after switching company",async()=>{
  let previous: ((response:Response)=>void)|undefined;
  const fetcher=vi.fn((url:string,_options?:RequestInit)=>url.includes("company-one")
   ?new Promise<Response>(resolve=>{previous=resolve;})
   :Promise.resolve(Response.json({businessId:"company-two",origin:"https://second.example",token:"second"})));
  vi.stubGlobal("fetch",fetcher);
  const view=render(<AgencyAgentWindow agent={agent} businessId="company-one"/>);
  view.rerender(<AgencyAgentWindow agent={agent} businessId="company-two"/>);
  await waitFor(()=>expect(view.container.querySelector("iframe")?.getAttribute("src")).toContain("second.example"));
  await act(async()=>previous?.(Response.json({businessId:"company-one",origin:"https://first.example",token:"first"})));
  expect(view.container.querySelector("iframe")?.getAttribute("src")).toContain("second.example");
  expect(fetcher.mock.calls[0]?.[1]).toEqual(expect.objectContaining({signal:expect.any(AbortSignal)}));
 });
 it("refuses an embed response belonging to another company",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({businessId:"other",origin:"https://wrong.example",token:"wrong"})));
  const view=render(<AgencyAgentWindow agent={agent} businessId="company-one"/>);
  await screen.findByRole("alert");
  expect(view.container.querySelector("iframe")).toBeNull();
 });
 it("shows provisioning without opening a shared fallback iframe",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({state:"provisioning"},{status:202})));
  const view=render(<AgencyAgentWindow agent={agent} businessId="company-one"/>);
  await waitFor(()=>expect(screen.getByRole("status").textContent).toBe("provisioning"));
  expect(view.container.querySelector("iframe")).toBeNull();
 });
 it("keeps the iframe and selected profile when the embedded chat changes agents",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({businessId:"company-one",origin:"https://chat.example",token:"fixture"})));
  function Fixture(){
   const [active,setActive]=useState(findAgencyAgent("sona")!);
   return <AgencyAgentWindow agent={agent} activeAgent={active} businessId="company-one" onActiveAgentChange={id=>setActive(findAgencyAgent(id)!)}/>;
  }
  const view=render(<Fixture/>);
  await waitFor(()=>expect(view.container.querySelector("iframe")).not.toBeNull());
  const iframe=view.container.querySelector("iframe")!;
  const source=iframe.contentWindow!;
  const originalUrl=iframe.getAttribute("src");
  const post=vi.spyOn(source,"postMessage");
  const select=(origin:string,eventSource:Window|null,id:string)=>act(()=>window.dispatchEvent(new MessageEvent("message",{origin,source:eventSource,data:{type:"hermes-agent-selected",agentId:id}})));
  select("https://untrusted.example",source,"product");
  select("https://chat.example",window,"product");
  select("https://chat.example",source,"unknown");
  expect(screen.getByRole("heading",{name:"Sona"})).toBeTruthy();
  select("https://chat.example",source,"product");
  expect(screen.getByRole("heading",{name:"Product"})).toBeTruthy();
  expect(view.container.querySelector("iframe")).toBe(iframe);
  expect(iframe.getAttribute("src")).toBe(originalUrl);
  act(()=>window.dispatchEvent(new MessageEvent("message",{origin:"https://chat.example",source,data:{type:"hermes-embed-ready"}})));
  expect(post).toHaveBeenLastCalledWith({type:"4u-hermes-embed-auth",token:"fixture",agentId:"product"},"https://chat.example");
 });

});
