import type { ServidorDB } from "@/hooks/useServidores";
import { StatusBadge } from "./StatusBadge";
import { Clock, Briefcase, MapPin } from "lucide-react";

interface ServidorRowProps {
  servidor: ServidorDB;
}

export function ServidorRow({ servidor }: ServidorRowProps) {
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-border hover:bg-muted/50">
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

      <div className="hidden text-right lg:block">
        <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {servidor.vinculo.length > 25 ? servidor.vinculo.substring(0, 22) + "..." : servidor.vinculo}
        </span>
      </div>

      {servidor.observacao && (
        <div className="hidden text-right xl:block">
          <span className="text-xs italic text-muted-foreground">{servidor.observacao}</span>
        </div>
      )}
    </div>
  );
}
