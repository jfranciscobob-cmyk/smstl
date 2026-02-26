import { useState } from "react";
import type { Unidade } from "@/types/servidor";
import { ServidorRow } from "./ServidorRow";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnidadeCardProps {
  unidade: Unidade;
}

export function UnidadeCard({ unidade }: UnidadeCardProps) {
  const [expanded, setExpanded] = useState(true);
  const totalServidores = unidade.coordenacoes.reduce((acc, c) => acc + c.servidores.length, 0);
  const presentes = unidade.coordenacoes.reduce(
    (acc, c) => acc + c.servidores.filter(s => s.statusPresenca === "presente").length, 0
  );

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <div className="text-left">
            <h3 className="text-base font-bold text-foreground">{unidade.sigla}</h3>
            <p className="text-sm text-muted-foreground">{unidade.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{presentes}/{totalServidores}</span>
          <span className="text-xs text-muted-foreground">presentes</span>
        </div>
      </button>

      {/* Content */}
      <div className={cn("transition-all duration-300", expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden")}>
        {unidade.coordenacoes.map((coord) => (
          <div key={coord.id} className="border-t border-border/50">
            <div className="bg-muted/30 px-5 py-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {coord.nome}
                <span className="ml-2 font-normal">({coord.servidores.length} servidores)</span>
              </h4>
            </div>
            <div className="divide-y divide-border/30 px-1">
              {coord.servidores.map((servidor) => (
                <ServidorRow key={servidor.id} servidor={servidor} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
