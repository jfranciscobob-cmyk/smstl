import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { ServidorDB, DiretoriaDB, UnidadeDB } from "@/hooks/useServidores";
import {
  ArrowLeft, Loader2, Building2, Users, ChevronRight, UserCheck, Shield, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AcessoRapido() {
  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
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
    const [d, u] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
    ]);
    setServidores(allSrv as ServidorDB[]);
    setDiretorias((d.data ?? []) as DiretoriaDB[]);
    setUnidades((u.data ?? []) as UnidadeDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const diretores = servidores.filter(s => s.is_diretor && s.diretoria_id);
  const coordenadores = servidores.filter(s => s.is_coordenador && s.unidade_id);
  const secretario = servidores.find(s => s.is_secretario);
  const diretorGeral = servidores.find(s => s.is_diretor_geral);

  const getDiretoriaNome = (id: string | null) => diretorias.find(d => d.id === id)?.nome || "—";
  const getUnidade = (id: string | null) => unidades.find(u => u.id === id);

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
                  <Link
                    key={dir.id}
                    to={`/monitor?view=diretoria&diretoria=${dir.diretoria_id}`}
                    className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/30 group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{dir.nome}</p>
                        <p className="text-[10px] text-muted-foreground">Diretor(a)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{diretoriaNome}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {dirServs} servidores
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Coordenadores */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" /> Coordenadores — Acesso à Unidade
          </h2>
          {coordenadores.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum coordenador atribuído.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {coordenadores.map(coord => {
                const uni = getUnidade(coord.unidade_id);
                const uniServs = servidores.filter(s => s.unidade_id === coord.unidade_id).length;
                return (
                  <Link
                    key={coord.id}
                    to={`/monitor?view=unidade&diretoria=${uni?.diretoria_id || ""}&unidade=${coord.unidade_id}`}
                    className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/30 group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-accent/50 flex items-center justify-center">
                        <UserCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{coord.nome}</p>
                        <p className="text-[10px] text-muted-foreground">Coordenador(a)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{uni ? `${uni.sigla} — ${uni.nome}` : "—"}</span>
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
