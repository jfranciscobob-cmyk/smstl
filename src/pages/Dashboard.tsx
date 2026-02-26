import { useState } from "react";
import { diretorias, getStats, getAllServidores } from "@/data/servidores";
import { StatCard } from "@/components/StatCard";
import { UnidadeCard } from "@/components/UnidadeCard";
import { ServidorRow } from "@/components/ServidorRow";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Users,
  CheckCircle,
  Palmtree,
  AlertTriangle,
  Shield,
  Building2,
  Search,
  Filter,
} from "lucide-react";
import type { StatusPresenca } from "@/types/servidor";

const Dashboard = () => {
  const stats = getStats();
  const allServidores = getAllServidores();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusPresenca | "todos">("todos");
  const [view, setView] = useState<"hierarchy" | "list">("hierarchy");

  const filteredServidores = allServidores.filter((s) => {
    const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.cargo.toLowerCase().includes(search.toLowerCase()) ||
      s.setor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || s.statusPresenca === filterStatus;
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
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex h-2 w-2 rounded-full bg-status-present animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Monitoramento em tempo real</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <StatCard
            title="Total Servidores"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
            subtitle={`${stats.concursados} concursados`}
          />
          <StatCard
            title="Presentes"
            value={stats.presentes}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
            subtitle={`${Math.round((stats.presentes / stats.total) * 100)}% do efetivo`}
          />
          <StatCard
            title="Em Férias"
            value={stats.ferias}
            icon={<Palmtree className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title="Afastados"
            value={stats.afastados}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="danger"
          />
          <StatCard
            title="Funções Críticas"
            value={stats.funcoesCriticas}
            icon={<Shield className="h-5 w-5" />}
            variant="info"
            subtitle="Cobertura necessária"
          />
        </div>

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

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["todos", "presente", "ferias", "afastado", "ausente"] as const).map((status) => (
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
            <button
              onClick={() => setView("hierarchy")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "hierarchy" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "hierarchy" ? (
          <div className="space-y-6">
            {diretorias.map((dir) => (
              <div key={dir.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-6 rounded-full bg-primary" />
                  <h2 className="text-xl font-bold text-foreground">{dir.nome}</h2>
                  {dir.diretor && (
                    <span className="text-sm text-muted-foreground">
                      Diretor: <span className="font-medium text-foreground">{dir.diretor.nome}</span>
                    </span>
                  )}
                </div>
                <div className="grid gap-4">
                  {dir.unidades.map((unidade) => (
                    <UnidadeCard key={unidade.id} unidade={unidade} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50">
              <p className="text-sm font-medium text-muted-foreground">
                {filteredServidores.length} servidores encontrados
              </p>
            </div>
            <div className="divide-y divide-border/30 px-1">
              {filteredServidores.map((servidor) => (
                <ServidorRow key={servidor.id} servidor={servidor} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
