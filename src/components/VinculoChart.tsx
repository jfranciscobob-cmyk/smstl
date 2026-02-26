import type { ServidorDB } from "@/hooks/useServidores";
import { useMemo } from "react";

interface VinculoChartProps {
  servidores: ServidorDB[];
}

const VINCULO_COLORS: Record<string, string> = {
  "CONCURSADO (EFETIVO)": "bg-primary",
  "CONTRATO TEMPORARIO": "bg-warning",
  "COMISSIONADO": "bg-info",
};

export function VinculoChart({ servidores }: VinculoChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    servidores.forEach(s => {
      const v = s.vinculo || "Outros";
      counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [servidores]);

  const max = data.length > 0 ? data[0][1] : 1;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Distribuição por Vínculo
      </h3>
      <div className="space-y-3">
        {data.map(([vinculo, count]) => {
          const pct = Math.round((count / servidores.length) * 100);
          const color = VINCULO_COLORS[vinculo] || "bg-muted-foreground/30";
          return (
            <div key={vinculo}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                  {vinculo}
                </span>
                <span className="text-xs font-mono font-semibold text-muted-foreground ml-2">
                  {count} <span className="text-muted-foreground/50">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}