import { notFound } from "next/navigation";
import { findAgencyAgent } from "@/lib/agency-agents";
import { AgencyAgentWindow } from "@/components/agency-agent-window";
export default async function AgentPage({params}:{params:Promise<{agent:string}>}) {
 const {agent:id}=await params;const agent=findAgencyAgent(id);if(!agent)notFound();return <AgencyAgentWindow agent={agent}/>;
}
