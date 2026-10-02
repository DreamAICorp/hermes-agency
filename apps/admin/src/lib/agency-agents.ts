import catalog from "../../../../packages/contracts/src/hermes-agents.json";
export type AgencyAgent = { id: string; name: string; role: string; group: string; kind: string };
export const agencyAgents: AgencyAgent[] = catalog;
export const findAgencyAgent = (id: string) => agencyAgents.find(agent => agent.id === id);
