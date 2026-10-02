"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { SidebarTeamSkeleton } from "@/components/loading-skeletons";
import { recordPendingWorkspaceSwitch } from "@/lib/workspace-analytics";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useAgencyWorkspaces } from "@/lib/agency-workspaces";
export function WorkspaceSwitcher({compact=false,createHref="/onboarding/business?create=true",createLabel}:{compact?:boolean;createHref?:string;createLabel?:string}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation("nav");
  const { isMobile } = useSidebar();
  const businesses = useAgencyWorkspaces();
  const [switching, setSwitching] = useState(false);
  const active = businesses.data?.businesses.find((business) => business.active) ?? businesses.data?.businesses[0];

  async function selectBusiness(businessId: string) {
    if (businessId === active?.businessId) return;
    setSwitching(true);
    await queryClient.cancelQueries({ queryKey: ["businesses"] });
    queryClient.setQueryData<{businesses: {businessId:string;name:string;active:boolean}[]}>(["businesses"], current => current ? { businesses: current.businesses.map(business => ({...business, active:false})) } : current);
    try {
      const response = await fetch("/api/businesses/switch", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (!response.ok) throw new Error("Workspace switch failed.");
      recordPendingWorkspaceSwitch(businessId, active?.businessId ?? businessId);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "businesses" });
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
      router.refresh();
    } catch {
      // The response can be lost after the server commits the switch.
      // Re-read the authoritative tenant instead of restoring a stale iframe.
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
    } finally {
      setSwitching(false);
    }
  }

  if (businesses.isLoading) return <SidebarMenu className={compact?"w-full":"group-data-[collapsible=icon]:hidden"}><SidebarMenuItem><SidebarTeamSkeleton /></SidebarMenuItem></SidebarMenu>;

  return (
    <SidebarMenu className={compact?"w-full":"group-data-[collapsible=icon]:hidden"}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={compact ? <SidebarMenuButton disabled={switching} className="size-10 justify-center p-0" title={active?.name ?? t("sidebar.businessSlugFallback")} aria-label={active?.name ?? t("sidebar.businessSlugFallback")} tooltip={{children:active?.name ?? t("sidebar.businessSlugFallback"),hidden:false}} /> :
              <Item
                className="w-full gap-2 rounded-lg px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[popup-open=true]:bg-sidebar-accent data-[popup-open=true]:text-sidebar-accent-foreground"
                render={<button disabled={switching} type="button" />}
                size="xs"
              />
            }
          >
            <ItemMedia><WorkspaceInitial name={active?.name} /></ItemMedia>
            {!compact&&<ItemContent className="min-w-0">
              <ItemTitle className="ph-mask w-full truncate text-left font-medium">
                {active?.name ?? t("sidebar.businessSlugFallback")}
              </ItemTitle>
            </ItemContent>}
            {!compact&&<ItemActions><ChevronsUpDown className="size-4 text-muted-foreground" /></ItemActions>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56 rounded-xl" side={isMobile ? "bottom" : "right"} sideOffset={4}>
            <DropdownMenuGroup>
              {(businesses.data?.businesses ?? []).map((business) => (
                <DropdownMenuItem className="gap-2.5 px-3 py-2" key={business.businessId} onClick={() => void selectBusiness(business.businessId)}>
                  {business.businessId === active?.businessId ? <Check className="size-4" /> : <span className="size-4" />}
                  <span className="ph-mask truncate">{business.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2.5 px-3 py-2" render={<Link href={createHref} />}>
              <Plus className="size-4" />
              {createLabel ?? t("sidebar.createBusiness")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The workspace's first letter, matching the account avatar in the sidebar
 * footer, so the two account rows match.
 */
function WorkspaceInitial({ name }: { name: string | undefined }) {
  return (
    <Avatar aria-hidden="true" className="shadow-xs" size="sm">
      <AvatarFallback>{name?.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
    </Avatar>
  );
}
