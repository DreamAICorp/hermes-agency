// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});
