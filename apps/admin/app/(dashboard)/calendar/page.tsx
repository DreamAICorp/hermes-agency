import { CalendarSurface } from "@/components/receptionists/business-surfaces";
import { requireNewNavigation } from "@/lib/navigation-server";

export default async function CalendarPage() {
  await requireNewNavigation("/calendar");
  return <CalendarSurface />;
}
