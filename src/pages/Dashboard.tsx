import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ImportCSVButton } from "@/components/ImportCSVButton";
import { LoginForm } from "@/components/LoginForm";
import { StatCard } from "@/components/StatCard";
import { ServidorRow } from "@/components/ServidorRow";
import { DashboardHeader } from "@/components/DashboardHeader";
import { VinculoChart } from "@/components/VinculoChart";
import { HierarchyMonitor } from "@/components/HierarchyMonitor";
import { Link } from "react-router-dom";
import { UnidadeSection } from "@/components/UnidadeSection";
import { EditServidorModal } from "@/components/EditServidorModal";
import { CreateServidorModal } from "@/components/CreateServidorModal";
import { computeStats, type ServidorDB, type DiretoriaDB, type UnidadeDB, type CoordenacaoDB } from "@/hooks/useServidores";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Search, Filter,
  LogOut, Loader2, Network, UserPlus, TrendingUp, BarChart3, ClipboardList, ChevronRight, LayoutDashboard, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function DashboardContent({ signOut, userEmail }: { signOut: () => void; userEmail?: string }) {
  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<CoordenacaoDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [view, setView] = useState<"hierarchy" | "list">("hierarchy");
  const [editingServidor, setEditingServidor] = useState<ServidorDB | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const fetchAllServidores = async () => {
      const pageSize = 1000;
      let from = 0;
      const allServidores: ServidorDB[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("servidores")
          .select("*")
          .order("nome", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data ?? []) as ServidorDB[];
        allServidores.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return allServidores;
    };

    try {
      const [allServidores, diretoriasRes, unidadesRes, coordenacoesRes] = await Promise.all([
        fetchAllServidores(),
        supabase.from("diretorias").select("*").order("nome"),
        supabase.from("unidades").select("*").order("nome"),
        supabase.from("coordenacoes").select("*").order("nome"),
      ]);

      if (diretoriasRes.error || unidadesRes.error || coordenacoesRes.error) {
        throw new Error(
          diretoriasRes.error?.message ||
          unidadesRes.error?.message ||
          coordenacoesRes.error?.message ||
          "Erro ao carregar dados"
        );
      }

      setServidores(allServidores);
      setDiretorias((diretoriasRes.data ?? []) as DiretoriaDB[]);
      setUnidades((unidadesRes.data ?? []) as UnidadeDB[]);
      setCoordenacoes((coordenacoesRes.data ?? []) as CoordenacaoDB[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("servidores-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "servidores" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "diretorias" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "unidades" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "coordenacoes" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const stats = useMemo(() => computeStats(servidores), [servidores]);

  const filteredServidores = servidores.filter((s) => {
    const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.cargo.toLowerCase().includes(search.toLowerCase()) ||
      s.setor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || s.status_presenca === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { key: "todos", label: "Todos", count: servidores.length },
    { key: "presente", label: "Presentes", count: stats.presentes },
    { key: "ferias", label: "Férias", count: stats.ferias },
    { key: "afastado", label: "Afastados", count: stats.afastados },
    { key: "ausente", label: "Ausentes", count: stats.ausentes },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userEmail={userEmail}
        onSignOut={signOut}
        onCreateServidor={() => setShowCreateModal(true)}
      />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando servidores...</p>
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {loadError}
          </div>
        )}

        {/* Empty state */}
        {servidores.length === 0 && !isLoading && !loadError && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Nenhum servidor cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Importe sua planilha CSV de servidores para começar a usar o sistema de gestão.
            </p>
            <ImportCSVButton onComplete={loadData} />
          </div>
        )}

        {/* Dashboard content when data exists */}
        {servidores.length > 0 && !isLoading && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <StatCard
                title="Total Servidores"
                value={stats.total}
                icon={<Users className="h-5 w-5" />}
                subtitle={`${diretorias.length} diretorias · ${unidades.length} unidades`}
              />
              <StatCard
                title="Presentes"
                value={stats.presentes}
                icon={<CheckCircle className="h-5 w-5" />}
                variant="success"
                subtitle={stats.total > 0 ? `${Math.round((stats.presentes / stats.total) * 100)}% do efetivo` : "—"}
              />
              <StatCard
                title="Em Férias"
                value={stats.ferias}
                icon={<Palmtree className="h-5 w-5" />}
                variant="warning"
                subtitle={stats.total > 0 ? `${Math.round((stats.ferias / stats.total) * 100)}% do efetivo` : "—"}
              />
              <StatCard
                title="Afastados"
                value={stats.afastados}
                icon={<AlertTriangle className="h-5 w-5" />}
                variant="danger"
                subtitle={stats.total > 0 ? `${Math.round((stats.afastados / stats.total) * 100)}% do efetivo` : "—"}
              />
              <StatCard
                title="Funções Críticas"
                value={stats.funcoesCriticas}
                icon={<Shield className="h-5 w-5" />}
                variant="info"
                subtitle="Cobertura necessária"
              />
            </div>

            {/* Charts + quick actions row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <VinculoChart servidores={servidores} />
              </div>
              <div className="space-y-4">
                {/* Quick actions */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Ações Rápidas
                  </h3>
                  <div className="space-y-2">
                    <Link
                      to="/estrutura"
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors group"
                    >
                      <span className="flex items-center gap-3">
                        <Network className="h-4 w-4 text-primary" />
                        Gerenciar Estrutura
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors group"
                    >
                      <span className="flex items-center gap-3">
                        <UserPlus className="h-4 w-4 text-primary" />
                        Novo Servidor
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Resumo rápido */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Resumo
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Concursados</span>
                      <span className="text-sm font-mono font-bold text-foreground">{stats.concursados.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Contratados</span>
                      <span className="text-sm font-mono font-bold text-foreground">{stats.contratados.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Diretorias</span>
                      <span className="text-sm font-mono font-bold text-foreground">{diretorias.length}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Unidades</span>
                      <span className="text-sm font-mono font-bold text-foreground">{unidades.length}</span>
                    </div>
                  </div>
                </div>

                {/* Import */}
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Importação
                  </h3>
                  <ImportCSVButton onComplete={loadData} />
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, cargo ou setor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {statusFilters.map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        filterStatus === key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                      <span className={`ml-1.5 font-mono ${filterStatus === key ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setView("hierarchy")}
                    className={`px-3.5 py-2.5 text-xs font-medium transition-all ${view === "hierarchy" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    <Building2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={`px-3.5 py-2.5 text-xs font-medium transition-all ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    <ClipboardList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Server list */}
            {view === "hierarchy" ? (
              <div className="space-y-6">
                {diretorias.map((dir) => {
                  const dirUnidades = unidades.filter((u) => u.diretoria_id === dir.id);
                  const dirServidor = servidores.find((s) => s.diretoria_id === dir.id && s.is_diretor);
                  return (
                    <div key={dir.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-1 rounded-full gradient-primary" />
                        <div>
                          <h2 className="text-lg font-bold text-foreground">{dir.nome}</h2>
                          {dirServidor && (
                            <p className="text-xs text-muted-foreground">
                              Diretor(a): <span className="font-semibold text-foreground">{dirServidor.nome}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 pl-4 border-l-2 border-border ml-1">
                        {dirUnidades.map((unidade) => (
                          <UnidadeSection
                            key={unidade.id}
                            unidade={unidade}
                            coordenacoes={coordenacoes.filter((c) => c.unidade_id === unidade.id)}
                            servidores={filteredServidores.filter((s) => s.unidade_id === unidade.id)}
                            onEditServidor={setEditingServidor}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredServidores.filter((s) => !s.diretoria_id).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 rounded-full bg-muted-foreground/30" />
                      <h2 className="text-lg font-bold text-foreground">Sem Diretoria</h2>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
                      {filteredServidores.filter((s) => !s.diretoria_id).slice(0, 50).map((servidor) => (
                        <ServidorRow key={servidor.id} servidor={servidor} onEdit={setEditingServidor} />
                      ))}
                      {filteredServidores.filter((s) => !s.diretoria_id).length > 50 && (
                        <div className="px-5 py-3 text-center text-xs text-muted-foreground">
                          Mostrando 50 de {filteredServidores.filter((s) => !s.diretoria_id).length} servidores sem diretoria
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">
                    {filteredServidores.length.toLocaleString("pt-BR")} servidores encontrados
                  </p>
                </div>
                <div className="divide-y divide-border/50">
                  {filteredServidores.slice(0, 100).map((servidor) => (
                    <ServidorRow key={servidor.id} servidor={servidor} onEdit={setEditingServidor} />
                  ))}
                  {filteredServidores.length > 100 && (
                    <div className="px-5 py-4 text-center text-sm text-muted-foreground">
                      Mostrando 100 de {filteredServidores.length.toLocaleString("pt-BR")} servidores. Use a busca para refinar.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <EditServidorModal
        servidor={editingServidor}
        open={!!editingServidor}
        onClose={() => setEditingServidor(null)}
        onSaved={loadData}
        diretorias={diretorias}
        unidades={unidades}
        coordenacoes={coordenacoes}
      />

      <CreateServidorModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={loadData}
        diretorias={diretorias}
        unidades={unidades}
        coordenacoes={coordenacoes}
      />
    </div>
  );
}

const Dashboard = () => {
  const { session, loading: authLoading, signOut, user } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginForm />;

  return <DashboardContent signOut={signOut} userEmail={user?.email} />;
};

export default Dashboard;