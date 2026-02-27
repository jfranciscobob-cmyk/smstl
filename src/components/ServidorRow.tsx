import type { ServidorDB } from "@/hooks/useServidores";
import { StatusBadge } from "./StatusBadge";
import { Clock, Briefcase, MapPin, Pencil, Link2 } from "lucide-react";

interface ServidorRowProps {
  servidor: ServidorDB;
  onEdit?: (servidor: ServidorDB) => void;
}

export function ServidorRow({ servidor, onEdit }: ServidorRowProps) {
  return (
    <div
      onClick={() => onEdit?.(servidor)}
      className="group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-border hover:bg-muted/50 cursor-pointer"
    >
      <div className="flex-shrink-0">
        <StatusBadge status={servidor.status_presenca} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{servidor.nome}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {servidor.cargo}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {servidor.setor || servidor.local_trabalho}
          </span>
        </div>
      </div>

      {servidor.escala_inicio1 && (
        <div className="hidden text-right text-xs text-muted-foreground sm:block">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{servidor.escala_inicio1} - {servidor.escala_fim1}</span>
          </div>
          {servidor.escala_inicio2 && (
            <div className="mt-0.5">{servidor.escala_inicio2} - {servidor.escala_fim2}</div>
          )}
          {servidor.escala_total_horas && (
            <span className="text-foreground font-medium">{servidor.escala_total_horas}h</span>
          )}
        </div>
      )}

      <div className="hidden text-right lg:block space-y-1">
        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${servidor.vinculo === "ESTAGIARIO" ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700" : "bg-secondary text-secondary-foreground"}`}>
          {servidor.vinculo === "ESTAGIARIO" ? "🎓 ESTAGIÁRIO" : servidor.vinculo.length > 25 ? servidor.vinculo.substring(0, 22) + "..." : servidor.vinculo}
        </span>
        {servidor.duplo_vinculo && (
          <span className="flex items-center justify-end gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <Link2 className="h-3 w-3" />
            DUPLO VÍNCULO
          </span>
        )}
      </div>

      {servidor.observacao && (
        <div className="hidden text-right xl:block">
          <span className="text-xs italic text-muted-foreground">{servidor.observacao}</span>
        </div>
      )}

      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}
