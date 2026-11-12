import { ModuleGate } from "@/features/auth";
import { WebMenuManager } from "@/features/system";

export default function DashboardWebPage() {
  return (
    <ModuleGate module="web">
      <WebMenuManager />
    </ModuleGate>
  );
}
