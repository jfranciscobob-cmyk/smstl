import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { ServidorDB, DiretoriaDB, UnidadeDB, CoordenadorUnidadeDB } from "@/hooks/useServidores";
import {
  ArrowLeft, Loader2, Building2, Users, ChevronRight, UserCheck, Shield, Briefcase, Monitor, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AcessoRapido() {
  const auth = useAuthSession();
  const { isAdmin, isDiretor, isCoordenador, diretoriaIds, unidadeIds } = auth;

  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [coordenadoresUnidades, setCoordenadoresUnidades] = useState<CoordenadorUnidadeDB[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const PAGE = 1000;
    let offset = 0;
    let allSrv: any[] = [];
    while (true) {
      const { data, error } = await supabase.from("servidores").select("*").order("nome").range(offset, offset + PAGE - 1);
      if (error || !data || data.length === 0) break;
      allSrv = allSrv.concat(data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const [d, u, cu] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("coordenadores_unidades").select("*"),
    ]);
    setServidores(allSrv as ServidorDB[]);
    setDiretorias((d.data ?? []) as DiretoriaDB[]);
    setUnidades((u.data ?? []) as UnidadeDB[]);
    setCoordenadoresUnidades((cu.data ?? []) as CoordenadorUnidadeDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Permission-based filtering ---
  // Admin sees everything. Diretor sees only their diretorias. Coordenador sees only their unidades.
  const allowedDiretoriaIds = useMemo(() => {
    if (isAdmin) return null; // null = no filter
    return new Set(diretoriaIds);
  }, [isAdmin, diretoriaIds]);

  const allowedUnidadeIds = useMemo(() => {
    if (isAdmin) return null;
    if (isDiretor) {
      // Diretor can see all unidades of their diretorias
      const uniIds = unidades.filter(u => diretoriaIds.includes(u.diretoria_id)).map(u => u.id);
      return new Set([...unidadeIds, ...uniIds]);
    }
    return new Set(unidadeIds);
  }, [isAdmin, isDiretor, diretoriaIds, unidadeIds, unidades]);

  const filteredDiretorias = useMemo(() => {
    if (!allowedDiretoriaIds) return diretorias;
    return diretorias.filter(d => allowedDiretoriaIds.has(d.id));
  }, [diretorias, allowedDiretoriaIds]);

  const filteredUnidades = useMemo(() => {
    if (!allowedUnidadeIds) return unidades;
    return unidades.filter(u => allowedUnidadeIds.has(u.id));
  }, [unidades, allowedUnidadeIds]);

  const filteredServidores = useMemo(() => {
    if (isAdmin) return servidores;
    const uniSet = allowedUnidadeIds;
    const dirSet = allowedDiretoriaIds;
    return servidores.filter(s => {
      if (dirSet && s.diretoria_id && dirSet.has(s.diretoria_id)) return true;
      if (uniSet && s.unidade_id && uniSet.has(s.unidade_id)) return true;
      return false;
    });
  }, [isAdmin, servidores, allowedDiretoriaIds, allowedUnidadeIds]);

  const diretores = filteredServidores.filter(s => s.is_diretor && s.diretoria_id);
  const secretario = isAdmin ? servidores.find(s => s.is_secretario) : null;
  const diretorGeral = isAdmin ? servidores.find(s => s.is_diretor_geral) : null;

  const coordenadorEntries = useMemo(() => {
    return coordenadoresUnidades.map(cu => {
      const servidor = servidores.find(s => s.id === cu.servidor_id);
      const uni = filteredUnidades.find(u => u.id === cu.unidade_id);
      return servidor && uni ? { servidor, unidade: uni, cuId: cu.id } : null;
    }).filter(Boolean) as { servidor: ServidorDB; unidade: UnidadeDB; cuId: string }[];
  }, [coordenadoresUnidades, servidores, filteredUnidades]);

  const getDiretoriaNome = (id: string | null) => diretorias.find(d => d.id === id)?.nome || "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Acesso Rápido</h1>
              <p className="text-xs text-muted-foreground">Diretores e coordenadores — acesso direto às suas áreas</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-10">
        {/* Secretário & Diretor Geral */}
        {(secretario || diretorGeral) && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Liderança
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {secretario && (
                <Link
                  to="/monitor?view=tudo"
                  className="rounded-xl border border-primary/30 bg-primary/5 p-5 hover:shadow-lg transition-all hover:border-primary/50 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{secretario.nome}</p>
                      <p className="text-[10px] text-muted-foreground">Secretário(a)</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">Visão Geral</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              )}
              {diretorGeral && (
                <Link
                  to="/monitor?view=tudo"
                  className="rounded-xl border border-primary/30 bg-primary/5 p-5 hover:shadow-lg transition-all hover:border-primary/50 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{diretorGeral.nome}</p>
                      <p className="text-[10px] text-muted-foreground">Diretor(a) Geral</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">Visão Geral</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Diretores */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Diretores — Acesso à Diretoria
          </h2>
          {diretores.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum diretor atribuído.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {diretores.map(dir => {
                const diretoriaNome = getDiretoriaNome(dir.diretoria_id);
                const dirServs = servidores.filter(s => s.diretoria_id === dir.diretoria_id).length;
                return (
                  <div key={dir.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/30 group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{dir.nome}</p>
                        <p className="text-[10px] text-muted-foreground">Diretor(a)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{diretoriaNome}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {dirServs} servidores
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/monitor?view=diretoria&diretoria=${dir.diretoria_id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> Monitor
                      </Link>
                      <Link
                        to={`/tv?diretoria=${dir.diretoria_id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-medium hover:bg-teal-500/20 transition-colors"
                      >
                        <Monitor className="h-3 w-3" /> Modo TV
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* TV por Diretoria */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" /> Modo TV por Diretoria
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              to="/tv"
              className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-5 hover:shadow-md transition-all hover:border-teal-500/50 group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Monitor className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Visão Geral</p>
                  <p className="text-[10px] text-muted-foreground">Todas as diretorias</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-500 transition-colors ml-auto" />
            </Link>
            {diretorias.map(dir => {
              const dirServs = servidores.filter(s => s.diretoria_id === dir.id).length;
              if (dirServs === 0) return null;
              return (
                <Link
                  key={dir.id}
                  to={`/tv?diretoria=${dir.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-teal-500/30 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-teal-500/10 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{dir.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{dirServs} servidores</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-500 transition-colors ml-auto" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Coordenadores */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" /> Coordenadores — Acesso à Unidade
          </h2>
          {coordenadorEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum coordenador atribuído.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {coordenadorEntries.map(({ servidor, unidade, cuId }) => {
                const uniServs = servidores.filter(s => s.unidade_id === unidade.id).length;
                return (
                  <Link
                    key={cuId}
                    to={`/monitor?view=unidade&diretoria=${unidade.diretoria_id}&unidade=${unidade.id}`}
                    className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/30 group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-accent/50 flex items-center justify-center">
                        <UserCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{servidor.nome}</p>
                        <p className="text-[10px] text-muted-foreground">Coordenador(a)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{unidade.sigla} — {unidade.nome}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {uniServs} servidores
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
