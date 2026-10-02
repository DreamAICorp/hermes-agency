"use client";
import { useQuery } from "@tanstack/react-query";
export type AgencyBusiness = { businessId: string; name: string; active: boolean };
export function useAgencyWorkspaces() {
  return useQuery({
    queryKey: ["businesses"],
    queryFn: async (): Promise<{ businesses: AgencyBusiness[] }> => {
      const response = await fetch("/api/businesses", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load workspaces.");
      return response.json();
    },
  });
}
