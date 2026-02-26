import { useState, useMemo } from "react";
import type { ServidorDB, DiretoriaDB, UnidadeDB, CoordenacaoDB } from "@/hooks/useServidores";
import {
  Shield, Building2, ChevronDown, ChevronRight, Crown, Users,
  AlertTriangle, CheckCircle, Palmtree, Star, MapPin, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HierarchyMonitorProps {
  servidores: ServidorDB[];
  diretorias: DiretoriaDB[];
  unidades: UnidadeDB[];
  coordenacoes: CoordenacaoDB[];
}

function StatusBar({ presentes, ferias, afastados, ausentes, total }: {
  presentes: number; ferias: number; afastados: number; ausentes: number; total: number;
}) {
  if (total === 0) return null;
  const pPresente = (presentes / total) * 100;
  const pFerias = (ferias / total) * 100;
  const pAfastado = (afastados / total) * 100;
  const pAusente = (ausentes / total) * 100;

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
      {pPresente > 0 && <div className="bg-success transition-all" style={{ width: `${pPresente}%` }} />}
      {pFerias > 0 && <div className="bg-warning transition-all" style={{ width: `${pFerias}%` }} />}
      {pAfastado > 0 && <div className="bg-destructive transition-all" style={{ width: `${pAfastado}%` }} />}
      {pAusente > 0 && <div className="bg-muted-foreground/40 transition-all" style={{ width: `${pAusente}%` }} />}
    </div>
  );
}

function CoverageIndicator({ presentes, total }: { presentes: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round((presentes / total) * 100);
  const color = pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
  const bg = pct >= 80 ? "bg-success/10" : pct >= 50 ? "bg-warning/10" : "bg-destructive/10";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold font-mono", color, bg)}>
      {pct}%
    </span>
  );
}

function StatusCounts({ presentes, ferias, afastados, ausentes }: {
  presentes: number; ferias: number; afastados: number; ausentes: number;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="flex items-center gap-1 text-xs text-success font-medium">
        <CheckCircle className="h-3 w-3" /> {presentes}
      </span>
      <span className="flex items-center gap-1 text-xs text-warning font-medium">
        <Palmtree className="h-3 w-3" /> {ferias}
      </span>
      <span className="flex items-center gap-1 text-xs text-destructive font-medium">
        <AlertTriangle className="h-3 w-3" /> {afastados}
      </span>
      {ausentes > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Users className="h-3 w-3" /> {ausentes}
        </span>
      )}
    </div>
  );
}

function getStats(servidores: ServidorDB[]) {
  const total = servidores.length;
  const presentes = servidores.filter(s => s.status_presenca === "presente").length;
  const ferias = servidores.filter(s => s.status_presenca === "ferias").length;
  const afastados = servidores.filter(s => s.status_presenca === "afastado").length;
  const ausentes = servidores.filter(s => s.status_presenca === "ausente").length;
  const funcoesCriticas = servidores.filter(s => s.funcao_critica && s.status_presenca !== "presente").length;
  return { total, presentes, ferias, afastados, ausentes, funcoesCriticas };
}

function UnidadeCard({ unidade, servidores, coordenacoes, coordenador }: {
  unidade: UnidadeDB;
  servidores: ServidorDB[];
  coordenacoes: CoordenacaoDB[];
  coordenador?: ServidorDB;
}) {
  const stats = getStats(servidores);

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary mr-1.5">{unidade.sigla}</span>
            <span className="text-xs text-muted-foreground">{unidade.nome}</span>
          </div>
        </div>
        <CoverageIndicator presentes={stats.presentes} total={stats.total} />
      </div>

      {coordenador && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 text-amber-500" />
          <span className="font-medium text-foreground">{coordenador.nome}</span>
        </div>
      )}

      <StatusBar {...stats} />
      <StatusCounts {...stats} />

      {stats.funcoesCriticas > 0 && (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          {stats.funcoesCriticas} função(ões) crítica(s) descoberta(s)
        </div>
      )}
    </div>
  );
}

function DiretoriaCard({ diretoria, servidores, unidades, coordenacoes }: {
  diretoria: DiretoriaDB;
  servidores: ServidorDB[];
  unidades: UnidadeDB[];
  coordenacoes: CoordenacaoDB[];
}) {
  const [expanded, setExpanded] = useState(true);
  const dirServidores = servidores.filter(s => s.diretoria_id === diretoria.id);
  const dirUnidades = unidades.filter(u => u.diretoria_id === diretoria.id);
  const stats = getStats(dirServidores);
  const diretor = servidores.find(s => s.diretoria_id === diretoria.id && s.is_diretor);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? <ChevronDown className="h-5 w-5 text-primary flex-shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
          <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{diretoria.nome}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              {diretor && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Crown className="h-3 w-3 text-amber-500" />
                  <span className="font-medium text-foreground">{diretor.nome}</span>
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {dirUnidades.length} unidade(s) · {stats.total} servidores
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <StatusCounts {...stats} />
          <CoverageIndicator presentes={stats.presentes} total={stats.total} />
        </div>
      </button>

      <div className="px-5 pb-1">
        <StatusBar {...stats} />
      </div>

      {stats.funcoesCriticas > 0 && (
        <div className="mx-5 mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          {stats.funcoesCriticas} função(ões) crítica(s) descoberta(s)
        </div>
      )}

      {expanded && dirUnidades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-3 ml-4 border-l-2 border-primary/20">
          {dirUnidades.map(uni => {
            const uniServidores = servidores.filter(s => s.unidade_id === uni.id);
            const coordenador = servidores.find(s => s.unidade_id === uni.id && s.is_coordenador);
            return (
              <UnidadeCard
                key={uni.id}
                unidade={uni}
                servidores={uniServidores}
                coordenacoes={coordenacoes.filter(c => c.unidade_id === uni.id)}
                coordenador={coordenador}
              />
            );
          })}
        </div>
      )}

      {expanded && dirUnidades.length === 0 && (
        <div className="px-5 pb-4 pt-2">
          <p className="text-xs text-muted-foreground italic">Nenhuma unidade cadastrada nesta diretoria.</p>
        </div>
      )}
    </div>
  );
}

export function HierarchyMonitor({ servidores, diretorias, unidades, coordenacoes }: HierarchyMonitorProps) {
  const globalStats = useMemo(() => getStats(servidores), [servidores]);
  const secretario = servidores.find(s => s.is_secretario);
  const diretorGeral = servidores.find(s => (s as any).is_diretor_geral);
  const semDiretoria = servidores.filter(s => !s.diretoria_id);
  const semDirStats = getStats(semDiretoria);

  return (
    <div className="space-y-4">
      {/* Secretaria Root Card */}
      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/20">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Secretaria Municipal de Saúde</h2>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  {secretario && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Crown className="h-3 w-3 text-primary" />
                      Secretário(a): <span className="font-semibold text-foreground">{secretario.nome}</span>
                    </span>
                  )}
                  {diretorGeral && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Crown className="h-3 w-3 text-amber-500" />
                      Diretor(a) Geral: <span className="font-semibold text-foreground">{diretorGeral.nome}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl font-extrabold font-mono text-foreground">{globalStats.total.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">servidores</p>
              </div>
              <CoverageIndicator presentes={globalStats.presentes} total={globalStats.total} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <StatusBar {...globalStats} />
            <div className="flex items-center justify-between">
              <StatusCounts {...globalStats} />
              {globalStats.funcoesCriticas > 0 && (
                <span className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {globalStats.funcoesCriticas} função(ões) crítica(s) descoberta(s)
                </span>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Presentes</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Férias</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Afastados</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Ausentes</span>
          </div>
        </div>
      </div>

      {/* Diretorias */}
      <div className="space-y-3 ml-4 border-l-2 border-primary/20 pl-4">
        {diretorias.map(dir => (
          <DiretoriaCard
            key={dir.id}
            diretoria={dir}
            servidores={servidores}
            unidades={unidades}
            coordenacoes={coordenacoes}
          />
        ))}

        {/* Sem diretoria */}
        {semDiretoria.length > 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">Sem Diretoria</span>
                <span className="text-xs text-muted-foreground">({semDiretoria.length} servidores)</span>
              </div>
              <CoverageIndicator presentes={semDirStats.presentes} total={semDirStats.total} />
            </div>
            <StatusBar {...semDirStats} />
            <div className="mt-2">
              <StatusCounts {...semDirStats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}