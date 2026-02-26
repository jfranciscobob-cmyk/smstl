import { useState, useEffect } from "react";
import { useServidores, useDiretorias, useUnidades, useCoordenacoes, computeStats, type ServidorDB } from "@/hooks/useServidores";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";
import { StatCard } from "@/components/StatCard";
import { ServidorRow } from "@/components/ServidorRow";
import { UnidadeSection } from "@/components/UnidadeSection";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Search, Filter, LogOut, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Dashboard = () => {
  const { session, loading: authLoading, signOut, user } = useAuth();
  const { data: servidores = [], isLoading } = useServidores();
  const stats = computeStats(servidores);
  const { data: diretorias = [] } = useDiretorias();
  const { data: unidades = [] } = useUnidades();
  const { data: coordenacoes = [] } = useCoordenacoes();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [view, setView] = useState<"hierarchy" | "list">("hierarchy");

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("servidores-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "servidores" }, () => {
        queryClient.invalidateQueries({ queryKey: ["servidores"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <LoginForm />;

  const filteredServidores = servidores.filter((s) => {
    const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.cargo.toLowerCase().includes(search.toLowerCase()) ||
      s.setor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || s.status_presenca === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Saúde Três Lagoas</h1>
                <p className="text-xs text-muted-foreground">Gestão de Servidores — Secretaria Municipal de Saúde</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 md:flex">
                <div className="flex h-2 w-2 rounded-full bg-status-present animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">Tempo real</span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <StatCard title="Total Servidores" value={stats.total} icon={<Users className="h-5 w-5" />} subtitle={`${stats.concursados} concursados`} />
          <StatCard title="Presentes" value={stats.presentes} icon={<CheckCircle className="h-5 w-5" />} variant="success" subtitle={stats.total > 0 ? `${Math.round((stats.presentes / stats.total) * 100)}% do efetivo` : "—"} />
          <StatCard title="Em Férias" value={stats.ferias} icon={<Palmtree className="h-5 w-5" />} variant="warning" />
          <StatCard title="Afastados" value={stats.afastados} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" />
          <StatCard title="Funções Críticas" value={stats.funcoesCriticas} icon={<Shield className="h-5 w-5" />} variant="info" subtitle="Cobertura necessária" />
        </div>

        {/* Empty state */}
        {servidores.length === 0 && !isLoading && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhum servidor cadastrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              O banco de dados está pronto. Comece cadastrando as diretorias, unidades, coordenações e servidores.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {servidores.length > 0 && (
          <>
            {/* Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar servidor, cargo ou setor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {["todos", "presente", "ferias", "afastado", "ausente"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterStatus === status
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {status === "todos" ? "Todos" : status === "presente" ? "Presentes" : status === "ferias" ? "Férias" : status === "afastado" ? "Afastados" : "Ausentes"}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button onClick={() => setView("hierarchy")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "hierarchy" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                  <Building2 className="h-4 w-4" />
                </button>
                <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                  <Users className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {view === "hierarchy" ? (
              <div className="space-y-6">
                {diretorias.map((dir) => {
                  const dirUnidades = unidades.filter((u) => u.diretoria_id === dir.id);
                  const dirServidor = servidores.find((s) => s.diretoria_id === dir.id && s.is_diretor);
                  return (
                    <div key={dir.id} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1 w-6 rounded-full bg-primary" />
                        <h2 className="text-xl font-bold text-foreground">{dir.nome}</h2>
                        {dirServidor && (
                          <span className="text-sm text-muted-foreground">
                            Diretor: <span className="font-medium text-foreground">{dirServidor.nome}</span>
                          </span>
                        )}
                      </div>
                      <div className="grid gap-4">
                        {dirUnidades.map((unidade) => (
                          <UnidadeSection
                            key={unidade.id}
                            unidade={unidade}
                            coordenacoes={coordenacoes.filter((c) => c.unidade_id === unidade.id)}
                            servidores={filteredServidores.filter((s) => s.unidade_id === unidade.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Servidores sem diretoria */}
                {filteredServidores.filter((s) => !s.diretoria_id).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-6 rounded-full bg-muted-foreground" />
                      <h2 className="text-xl font-bold text-foreground">Sem Diretoria</h2>
                    </div>
                    <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/30 px-1">
                      {filteredServidores.filter((s) => !s.diretoria_id).map((servidor) => (
                        <ServidorRow key={servidor.id} servidor={servidor} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/50">
                  <p className="text-sm font-medium text-muted-foreground">{filteredServidores.length} servidores encontrados</p>
                </div>
                <div className="divide-y divide-border/30 px-1">
                  {filteredServidores.map((servidor) => (
                    <ServidorRow key={servidor.id} servidor={servidor} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
