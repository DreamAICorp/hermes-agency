import { notFound } from "next/navigation";
import { findAgencyAgent } from "@/lib/agency-agents";
export default async function AgentPage({params}:{params:Promise<{agent:string}>}) {
 const {agent:id}=await params;const agent=findAgencyAgent(id);if(!agent)notFound();return null; // The external shell owns the single company-scoped agent window.
}
