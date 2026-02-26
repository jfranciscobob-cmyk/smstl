import { useState } from "react";
import type { UnidadeDB, CoordenacaoDB, ServidorDB } from "@/hooks/useServidores";
import { ServidorRow } from "./ServidorRow";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnidadeSectionProps {
  unidade: UnidadeDB;
  coordenacoes: CoordenacaoDB[];
  servidores: ServidorDB[];
}

export function UnidadeSection({ unidade, coordenacoes, servidores }: UnidadeSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const totalServidores = servidores.length;
  const presentes = servidores.filter((s) => s.status_presenca === "presente").length;

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
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

      <div className={cn("transition-all duration-300", expanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden")}>
        {coordenacoes.map((coord) => {
          const coordServidores = servidores.filter((s) => s.coordenacao_id === coord.id);
          if (coordServidores.length === 0) return null;
          return (
            <div key={coord.id} className="border-t border-border/50">
              <div className="bg-muted/30 px-5 py-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {coord.nome}
                  <span className="ml-2 font-normal">({coordServidores.length} servidores)</span>
                </h4>
              </div>
              <div className="divide-y divide-border/30 px-1">
                {coordServidores.map((servidor) => (
                  <ServidorRow key={servidor.id} servidor={servidor} />
                ))}
              </div>
            </div>
          );
        })}
        {/* Servidores sem coordenação nesta unidade */}
        {servidores.filter((s) => !s.coordenacao_id).length > 0 && (
          <div className="border-t border-border/50">
            <div className="bg-muted/30 px-5 py-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sem Coordenação
                <span className="ml-2 font-normal">({servidores.filter((s) => !s.coordenacao_id).length})</span>
              </h4>
            </div>
            <div className="divide-y divide-border/30 px-1">
              {servidores.filter((s) => !s.coordenacao_id).map((servidor) => (
                <ServidorRow key={servidor.id} servidor={servidor} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
