import { AlertTriangle, Clock, MapPin } from "lucide-react";
import type { ServidorDB, DiretoriaDB, UnidadeDB, SetorDB } from "@/hooks/useServidores";

interface ServidorConflictBadgeProps {
  servidor: ServidorDB;
  diretorias: DiretoriaDB[];
  unidades: UnidadeDB[];
  setores: SetorDB[];
  servidoresSetores?: { servidor_id: string; setor_id: string }[];
}

export function ServidorConflictBadge({
  servidor,
  diretorias,
  unidades,
  setores,
  servidoresSetores = [],
}: ServidorConflictBadgeProps) {
  const parts: string[] = [];

  if (servidor.diretoria_id) {
    const dir = diretorias.find(d => d.id === servidor.diretoria_id);
    if (dir) parts.push(`Dir: ${dir.nome}`);
  }

  if (servidor.unidade_id) {
    const uni = unidades.find(u => u.id === servidor.unidade_id);
    if (uni) parts.push(`Uni: ${uni.sigla}`);
  }

  if (servidor.setor_id) {
    const setor = setores.find(s => s.id === servidor.setor_id);
    if (setor) parts.push(`Setor: ${setor.nome}`);
  }

  const extraSetores = servidoresSetores
    .filter(ss => ss.servidor_id === servidor.id)
    .map(ss => setores.find(s => s.id === ss.setor_id)?.nome)
    .filter(Boolean);
  extraSetores.forEach(name => parts.push(`Setor: ${name}`));

  const hasEscala = servidor.escala_inicio1 || servidor.escala_total_horas;

  if (parts.length === 0 && !hasEscala) return null;

  return (
    <div className="flex flex-col gap-0.5 ml-auto">
      {parts.length > 0 && (
        <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 max-w-[200px]">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{parts.join(" → ")}</span>
        </span>
      )}
      {hasEscala && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3 flex-shrink-0" />
          {servidor.escala_inicio1 && `${servidor.escala_inicio1}-${servidor.escala_fim1}`}
          {servidor.escala_total_horas && ` (${servidor.escala_total_horas}h)`}
        </span>
      )}
    </div>
  );
}

export function ServidorAlreadyAllocatedWarning({
  count,
}: {
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-300">
        <strong>{count}</strong> servidor(es) selecionado(s) já possuem alocação anterior. Ao vincular, serão movidos.
      </span>
    </div>
  );
}
