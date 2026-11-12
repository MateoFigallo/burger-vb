import { ModuleGate } from "@/features/auth";
import { SystemManager } from "@/features/system";

export default function DashboardSistemaPage() {
  return (
    <ModuleGate module="sistema">
      <SystemManager />
    </ModuleGate>
  );
}
