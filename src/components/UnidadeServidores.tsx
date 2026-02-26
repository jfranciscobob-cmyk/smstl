import { useState, useMemo } from "react";
import type { ServidorDB } from "@/hooks/useServidores";
import { StatusBadge } from "./StatusBadge";
import {
  ChevronDown, ChevronRight, Briefcase, Clock, Users, Eye, MessageSquare, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CargoGroupProps {
  cargo: string;
  servidores: ServidorDB[];
  defaultExpanded?: boolean;
  onEditServidor?: (s: ServidorDB) => void;
}

function ServidorMiniCard({ servidor, onEdit }: { servidor: ServidorDB; onEdit?: (s: ServidorDB) => void }) {
  return (
    <button
      onClick={() => onEdit?.(servidor)}
      className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
    >
      <StatusBadge status={servidor.status_presenca} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{servidor.nome}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          {servidor.escala_inicio1 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {servidor.escala_inicio1}-{servidor.escala_fim1}
              {servidor.escala_inicio2 && ` / ${servidor.escala_inicio2}-${servidor.escala_fim2}`}
              {servidor.escala_total_horas && <span className="font-semibold text-foreground ml-1">{servidor.escala_total_horas}h</span>}
            </span>
          )}
          {!servidor.escala_inicio1 && servidor.escala_total_horas && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-semibold text-foreground">{servidor.escala_total_horas}h</span>
            </span>
          )}
        </div>
      </div>
      {servidor.funcao_critica && (
        <span className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
          <AlertTriangle className="h-3 w-3" /> Crítica
        </span>
      )}
      {servidor.observacao && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground italic max-w-[150px] truncate" title={servidor.observacao}>
          <MessageSquare className="h-3 w-3 flex-shrink-0" />
          {servidor.observacao}
        </span>
      )}
      <span className="hidden lg:inline-flex rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
        {servidor.vinculo.length > 20 ? servidor.vinculo.substring(0, 18) + "…" : servidor.vinculo}
      </span>
    </button>
  );
}

function CargoGroup({ cargo, servidores, defaultExpanded = false, onEditServidor }: CargoGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const presentes = servidores.filter(s => s.status_presenca === "presente").length;
  const total = servidores.length;
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const color = pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground truncate">{cargo}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs font-mono text-muted-foreground">{total}</span>
          <span className={cn("text-xs font-mono font-bold", color)}>{pct}%</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/30 divide-y divide-border/20">
          {servidores.map(s => (
            <ServidorMiniCard key={s.id} servidor={s} onEdit={onEditServidor} />
          ))}
        </div>
      )}
    </div>
  );
}

interface UnidadeServidoresProps {
  servidores: ServidorDB[];
  onEditServidor?: (s: ServidorDB) => void;
  title?: string;
  defaultExpanded?: boolean;
}

export function UnidadeServidores({ servidores, onEditServidor, title, defaultExpanded = false }: UnidadeServidoresProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const cargoGroups = useMemo(() => {
    const groups: Record<string, ServidorDB[]> = {};
    servidores.forEach(s => {
      const cargo = s.cargo || "Sem cargo";
      if (!groups[cargo]) groups[cargo] = [];
      groups[cargo].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [servidores]);

  if (servidores.length === 0) return null;

  return (
    <div className="space-y-2">
      {title && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Users className="h-3.5 w-3.5" />
          {title} ({servidores.length})
          <span className="text-[10px] font-normal">· {cargoGroups.length} cargo(s)</span>
        </button>
      )}
      {(expanded || !title) && (
        <div className="space-y-1.5">
          {cargoGroups.map(([cargo, srvs]) => (
            <CargoGroup key={cargo} cargo={cargo} servidores={srvs} onEditServidor={onEditServidor} />
          ))}
        </div>
      )}
    </div>
  );
}
