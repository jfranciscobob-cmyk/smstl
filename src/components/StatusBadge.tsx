import { cn } from "@/lib/utils";
import type { StatusPresenca } from "@/types/servidor";
import { CheckCircle, XCircle, Palmtree, AlertTriangle, Clock } from "lucide-react";

const statusConfig: Record<StatusPresenca, { label: string; icon: typeof CheckCircle; className: string }> = {
  presente: { label: "Presente", icon: CheckCircle, className: "bg-status-present/10 text-status-present" },
  ausente: { label: "Ausente", icon: XCircle, className: "bg-status-absent/10 text-status-absent" },
  ferias: { label: "Férias", icon: Palmtree, className: "bg-status-vacation/10 text-status-vacation" },
  afastado: { label: "Afastado", icon: AlertTriangle, className: "bg-status-absent/10 text-status-absent" },
  licenca: { label: "Licença", icon: Clock, className: "bg-status-leave/10 text-status-leave" },
};

export function StatusBadge({ status }: { status: StatusPresenca }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
