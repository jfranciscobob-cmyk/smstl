import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ImportCSVButton } from "@/components/ImportCSVButton";
import { LoginForm } from "@/components/LoginForm";
import { StatCard } from "@/components/StatCard";
import { ServidorRow } from "@/components/ServidorRow";
import { Link } from "react-router-dom";
import { UnidadeSection } from "@/components/UnidadeSection";
import { EditServidorModal } from "@/components/EditServidorModal";
import { CreateServidorModal } from "@/components/CreateServidorModal";
import { computeStats, type ServidorDB, type DiretoriaDB, type UnidadeDB, type CoordenacaoDB } from "@/hooks/useServidores";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Search, Filter, LogOut, Loader2, Network, UserPlus
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

    const [servidoresRes, diretoriasRes, unidadesRes, coordenacoesRes] = await Promise.all([
      supabase.from("servidores").select("*").order("nome").limit(2000),
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("coordenacoes").select("*").order("nome"),
    ]);

    if (servidoresRes.error || diretoriasRes.error || unidadesRes.error || coordenacoesRes.error) {
      setLoadError(
        servidoresRes.error?.message ||
        diretoriasRes.error?.message ||
        unidadesRes.error?.message ||
        coordenacoesRes.error?.message ||
        "Erro ao carregar dados"
      );
      setIsLoading(false);
      return;
    }

    setServidores((servidoresRes.data ?? []) as ServidorDB[]);
    setDiretorias((diretoriasRes.data ?? []) as DiretoriaDB[]);
    setUnidades((unidadesRes.data ?? []) as UnidadeDB[]);
    setCoordenacoes((coordenacoesRes.data ?? []) as CoordenacaoDB[]);
    setIsLoading(false);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const stats = useMemo(() => computeStats(servidores), [servidores]);

  const filteredServidores = servidores.filter((s) => {
    const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.cargo.toLowerCase().includes(search.toLowerCase()) ||
      s.setor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || s.status_presenca === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background">
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
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Novo Servidor
              </button>
              <Link
                to="/estrutura"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Network className="h-3.5 w-3.5" />
                Estrutura
              </Link>
              <span className="text-xs text-muted-foreground hidden sm:block">{userEmail}</span>
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
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 flex-1">
            <StatCard title="Total Servidores" value={stats.total} icon={<Users className="h-5 w-5" />} subtitle={`${stats.concursados} concursados`} />
            <StatCard title="Presentes" value={stats.presentes} icon={<CheckCircle className="h-5 w-5" />} variant="success" subtitle={stats.total > 0 ? `${Math.round((stats.presentes / stats.total) * 100)}% do efetivo` : "—"} />
            <StatCard title="Em Férias" value={stats.ferias} icon={<Palmtree className="h-5 w-5" />} variant="warning" />
            <StatCard title="Afastados" value={stats.afastados} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" />
            <StatCard title="Funções Críticas" value={stats.funcoesCriticas} icon={<Shield className="h-5 w-5" />} variant="info" subtitle="Cobertura necessária" />
          </div>
        </div>

        <div className="flex justify-end">
          <ImportCSVButton onComplete={loadData} />
        </div>

        {loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {servidores.length === 0 && !isLoading && !loadError && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhum servidor cadastrado</h3>
            <p className="mt-2 text-sm text-muted-foreground mb-6">
              Clique em "Importar Servidores do CSV" acima para popular o banco de dados.
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
                            onEditServidor={setEditingServidor}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredServidores.filter((s) => !s.diretoria_id).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1 w-6 rounded-full bg-muted-foreground" />
                      <h2 className="text-xl font-bold text-foreground">Sem Diretoria</h2>
                    </div>
                    <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/30 px-1">
                      {filteredServidores.filter((s) => !s.diretoria_id).map((servidor) => (
                        <ServidorRow key={servidor.id} servidor={servidor} onEdit={setEditingServidor} />
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
                    <ServidorRow key={servidor.id} servidor={servidor} onEdit={setEditingServidor} />
                  ))}
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <LoginForm />;

  return <DashboardContent signOut={signOut} userEmail={user?.email} />;
};

export default Dashboard;
