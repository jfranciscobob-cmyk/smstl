import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { ImportCSVButton } from "@/components/ImportCSVButton";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EditServidorModal } from "@/components/EditServidorModal";
import { CreateServidorModal } from "@/components/CreateServidorModal";
import { computeStats, type ServidorDB, type DiretoriaDB, type UnidadeDB, type CoordenacaoDB } from "@/hooks/useServidores";
import { Link } from "react-router-dom";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Search,
  LogOut, Loader2, Network, UserPlus, TrendingUp, BarChart3, Eye, UserCheck,
  Activity, DollarSign, Briefcase, Calendar, ChevronRight, MapPin, Clock, Star, ArrowUpRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend
} from "recharts";

// ─── Executive KPI Card ───
function KpiCard({ label, value, icon, color, subtitle, href }: {
  label: string; value: string; icon: React.ReactNode; color: string; subtitle?: string; href?: string;
}) {
  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { to: href } : {};
  return (
    <Wrapper
      {...wrapperProps as any}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${href ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-2xl font-extrabold font-mono text-foreground tracking-tight">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{label}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </Wrapper>
  );
}

// ─── Donut Chart Component ───
function DonutChart({ data, colors, total, centerLabel }: {
  data: { name: string; value: number }[]; colors: string[]; total: number; centerLabel: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: "hsl(200 50% 8%)", border: "none", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
            formatter={(value: number) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, ""]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold font-mono text-foreground">{total}</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{centerLabel}</span>
      </div>
    </div>
  );
}

// ─── Diretoria Bar Chart ───
function DiretoriaBarChart({ diretorias, servidores }: { diretorias: DiretoriaDB[]; servidores: ServidorDB[] }) {
  const data = useMemo(() => {
    const items = diretorias.map(dir => {
      const dirServs = servidores.filter(s => s.diretoria_id === dir.id);
      const presentes = dirServs.filter(s => s.status_presenca === "presente").length;
      return {
        nome: dir.nome.length > 18 ? dir.nome.substring(0, 16) + "…" : dir.nome,
        total: dirServs.length,
        presentes,
        ausencias: dirServs.length - presentes,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
    return items;
  }, [diretorias, servidores]);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(200 20% 90%)" vertical={false} />
        <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "hsl(200 10% 46%)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(200 10% 46%)" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{ background: "hsl(200 50% 8%)", border: "none", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
        />
        <Bar dataKey="presentes" name="Presentes" fill="hsl(152 60% 40%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="ausencias" name="Ausências" fill="hsl(0 72% 51% / 0.6)" radius={[4, 4, 0, 0]} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Coverage Alert Card ───
function AlertCard({ title, count, icon, color, items }: {
  title: string; count: number; icon: React.ReactNode; color: string; items: string[];
}) {
  if (count === 0) return null;
  return (
    <div className={`rounded-xl border ${color} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-lg font-extrabold font-mono">{count}</span>
      </div>
      {items.length > 0 && (
        <div className="space-y-1 mt-2">
          {items.slice(0, 5).map((name, i) => (
            <p key={i} className="text-[11px] text-muted-foreground truncate">• {name}</p>
          ))}
          {items.length > 5 && <p className="text-[10px] text-muted-foreground/60">+{items.length - 5} mais...</p>}
        </div>
      )}
    </div>
  );
}

function DashboardContent({ signOut, userEmail, hasFinancialAccess }: { signOut: () => void; userEmail?: string; hasFinancialAccess?: boolean }) {
  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<CoordenacaoDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingServidor, setEditingServidor] = useState<ServidorDB | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const fetchAllServidores = async () => {
      const pageSize = 1000;
      let from = 0;
      const all: ServidorDB[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("servidores")
          .select("*")
          .order("nome", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data ?? []) as ServidorDB[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return all;
    };

    try {
      const [allServidores, diretoriasRes, unidadesRes, coordenacoesRes] = await Promise.all([
        fetchAllServidores(),
        supabase.from("diretorias").select("*").order("nome"),
        supabase.from("unidades").select("*").order("nome"),
        supabase.from("coordenacoes").select("*").order("nome"),
      ]);

      if (diretoriasRes.error || unidadesRes.error || coordenacoesRes.error) {
        throw new Error(diretoriasRes.error?.message || unidadesRes.error?.message || coordenacoesRes.error?.message || "Erro");
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

  const folhaTotal = useMemo(() => servidores.reduce((sum, s) => sum + (s.salario || 0), 0), [servidores]);

  const statusData = useMemo(() => [
    { name: "Presentes", value: stats.presentes },
    { name: "Férias", value: stats.ferias },
    { name: "Afastados", value: stats.afastados },
    { name: "Ausentes", value: stats.ausentes },
  ].filter(d => d.value > 0), [stats]);

  const vinculoData = useMemo(() => {
    const counts: Record<string, number> = {};
    servidores.forEach(s => { counts[s.vinculo || "Outros"] = (counts[s.vinculo || "Outros"] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [servidores]);

  const funcoesCriticasDescobertas = useMemo(
    () => servidores.filter(s => s.funcao_critica && s.status_presenca !== "presente"),
    [servidores]
  );

  const contratosVencendo = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return servidores.filter(s => {
      if (!s.data_encerramento_contrato) return false;
      const d = new Date(s.data_encerramento_contrato);
      return d >= now && d <= in30;
    });
  }, [servidores]);

  const coberturaGeral = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;
  const alocados = servidores.filter(s => s.diretoria_id).length;
  const pctAlocados = stats.total > 0 ? Math.round((alocados / stats.total) * 100) : 0;

  const statusColors = ["hsl(152 60% 40%)", "hsl(38 92% 50%)", "hsl(0 72% 51%)", "hsl(200 10% 46%)"];
  const vinculoColors = ["hsl(174 62% 30%)", "hsl(38 92% 50%)", "hsl(210 75% 50%)", "hsl(270 50% 55%)", "hsl(200 10% 46%)"];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userEmail={userEmail}
        onSignOut={signOut}
        onCreateServidor={() => setShowCreateModal(true)}
        diretorias={diretorias}
        servidores={servidores}
      />

      <main className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando painel executivo...</p>
          </div>
        )}

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
              Importe sua planilha CSV de servidores para começar.
            </p>
            <ImportCSVButton onComplete={loadData} />
          </div>
        )}

        {servidores.length > 0 && !isLoading && (
          <>
            {/* ═══ Compact Hero Banner ═══ */}
            <div className="rounded-2xl gradient-hero p-5 sm:p-6 text-primary-foreground relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: "radial-gradient(circle at 20% 50%, hsl(174 62% 40%), transparent 50%), radial-gradient(circle at 80% 20%, hsl(210 75% 50%), transparent 50%)"
              }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Activity className="h-3.5 w-3.5 text-primary-foreground/60" />
                      <span className="text-[10px] font-semibold text-primary-foreground/50 uppercase tracking-widest">
                        {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                      Secretaria Municipal de Saúde
                    </h2>
                    <p className="text-[11px] text-primary-foreground/40">Três Lagoas · Painel Executivo</p>
                  </div>
                    <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 flex-wrap justify-end">
                      <Link to="/monitor" className="text-center hover:opacity-80 transition-opacity">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono">{stats.total}</p>
                        <p className="text-[9px] sm:text-[10px] text-primary-foreground/50 font-medium">Servidores</p>
                      </Link>
                      <Link to="/monitor?filter=presentes" className="text-center hover:opacity-80 transition-opacity">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono text-success">{coberturaGeral}%</p>
                        <p className="text-[9px] sm:text-[10px] text-primary-foreground/50 font-medium">Cobertura</p>
                      </Link>
                      <Link to="/estrutura" className="text-center hover:opacity-80 transition-opacity hidden sm:block">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono">{alocados}<span className="text-base text-primary-foreground/40">/{stats.total}</span></p>
                        <p className="text-[9px] sm:text-[10px] text-primary-foreground/50 font-medium">Alocados</p>
                      </Link>
                      <Link to="/monitor" className="text-center hover:opacity-80 transition-opacity hidden sm:block">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono">{diretorias.length}</p>
                        <p className="text-[9px] sm:text-[10px] text-primary-foreground/50 font-medium">Diretorias</p>
                      </Link>
                      {hasFinancialAccess && (
                        <div className="text-center hidden lg:block">
                          <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono">
                            {folhaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[9px] sm:text-[10px] text-primary-foreground/50 font-medium">Folha Mensal</p>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </div>

            {/* ═══ Indicadores rápidos ═══ */}
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-9 gap-2">
              <Link to="/monitor?filter=presentes" className="rounded-xl border border-success/30 bg-success/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-success">{stats.presentes}</p>
                <p className="text-[9px] font-semibold text-success/70 uppercase tracking-wider">Presentes</p>
              </Link>
              <Link to="/monitor?filter=ferias" className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-warning">{stats.ferias}</p>
                <p className="text-[9px] font-semibold text-warning/70 uppercase tracking-wider">Férias</p>
              </Link>
              <Link to="/monitor?filter=afastados" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-destructive">{stats.afastados}</p>
                <p className="text-[9px] font-semibold text-destructive/70 uppercase tracking-wider">Afastados</p>
              </Link>
              <Link to="/monitor?filter=ausentes" className="rounded-xl border border-border bg-card p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-muted-foreground">{stats.ausentes}</p>
                <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Ausentes</p>
              </Link>
              <Link to="/monitor?filter=concursados" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-primary">{stats.concursados}</p>
                <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Concursados</p>
              </Link>
              <Link to="/monitor?filter=contratados" className="rounded-xl border border-info/30 bg-info/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-info">{stats.contratados}</p>
                <p className="text-[9px] font-semibold text-info/70 uppercase tracking-wider">Contratados</p>
              </Link>
              <Link to="/monitor" className="rounded-xl border border-border bg-card p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <p className="text-lg font-extrabold font-mono text-foreground">{unidades.length}</p>
                <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Unidades</p>
              </Link>
              <Link to="/estrutura" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5" title={`${alocados} alocados em diretorias / ${stats.total - alocados} sem diretoria`}>
                <p className="text-lg font-extrabold font-mono text-primary">{alocados}</p>
                <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Alocados</p>
              </Link>
              <Link to="/monitor?filter=duplo_vinculo" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5" title="Servidores com dois vínculos">
                <p className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">{servidores.filter(s => s.duplo_vinculo).length}</p>
                <p className="text-[9px] font-semibold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider">Duplo Vínculo</p>
              </Link>
            </div>

            {/* ═══ DIRETORIAS — FOCO PRINCIPAL ═══ */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Situação das Diretorias
                </h3>
                <Link to="/monitor" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Ver no Monitor <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {diretorias.map(dir => {
                  const ds = servidores.filter(s => s.diretoria_id === dir.id);
                  const dp = ds.filter(s => s.status_presenca === "presente").length;
                  const dFerias = ds.filter(s => s.status_presenca === "ferias").length;
                  const dAfastados = ds.filter(s => s.status_presenca === "afastado").length;
                  const du = unidades.filter(u => u.diretoria_id === dir.id);
                  const df = ds.reduce((sum, s) => sum + (s.salario || 0), 0);
                  const cob = ds.length > 0 ? Math.round((dp / ds.length) * 100) : 0;
                  const cobColor = cob >= 80 ? "text-success" : cob >= 50 ? "text-warning" : "text-destructive";
                  const cobBg = cob >= 80 ? "bg-success" : cob >= 50 ? "bg-warning" : "bg-destructive";
                  const diretor = servidores.find(s => s.diretoria_id === dir.id && s.is_diretor);
                  const criticas = ds.filter(s => s.funcao_critica && s.status_presenca !== "presente");

                  return (
                    <Link
                      key={dir.id}
                      to={`/monitor?view=diretoria&diretoria=${dir.id}`}
                      className="group rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{dir.nome}</h4>
                          {diretor && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              Diretor(a): <span className="font-medium text-foreground/70">{diretor.nome}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className={`text-xl font-extrabold font-mono ${cobColor}`}>{cob}%</span>
                          <span className="text-[9px] text-muted-foreground font-medium">cobertura</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
                        <div className={`h-full rounded-full ${cobBg} transition-all duration-700`} style={{ width: `${cob}%` }} />
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center">
                          <p className="text-sm font-bold font-mono text-foreground">{ds.length}</p>
                          <p className="text-[8px] font-semibold text-muted-foreground uppercase">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold font-mono text-success">{dp}</p>
                          <p className="text-[8px] font-semibold text-success/70 uppercase">Presentes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold font-mono text-warning">{dFerias}</p>
                          <p className="text-[8px] font-semibold text-warning/70 uppercase">Férias</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-sm font-bold font-mono text-destructive">{dAfastados}</p>
                          <p className="text-[8px] font-semibold text-destructive/70 uppercase">Afastados</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold font-mono text-primary">{ds.filter(s => (s.vinculo || "").includes("CONCURSADO")).length}</p>
                          <p className="text-[8px] font-semibold text-primary/70 uppercase">Concursados</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold font-mono text-info">{ds.filter(s => (s.vinculo || "").includes("CONTRATO")).length}</p>
                          <p className="text-[8px] font-semibold text-info/70 uppercase">Contratados</p>
                        </div>
                      </div>

                      {/* Footer: units + financial + alerts */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {du.length} unid.</span>
                          {hasFinancialAccess && df > 0 && (
                            <span className="flex items-center gap-1 text-primary font-mono font-bold">
                              <DollarSign className="h-3 w-3" />
                              {df.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                        {criticas.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-destructive font-semibold">
                            <AlertTriangle className="h-3 w-3" /> {criticas.length} crítica{criticas.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}

                {/* Sem diretoria */}
                {(() => {
                  const semDir = servidores.filter(s => !s.diretoria_id);
                  if (semDir.length === 0) return null;
                  const sp = semDir.filter(s => s.status_presenca === "presente").length;
                  const folha = semDir.reduce((s, sv) => s + (sv.salario || 0), 0);
                  const cob = semDir.length > 0 ? Math.round((sp / semDir.length) * 100) : 0;
                  return (
                    <div className="rounded-2xl border border-dashed border-warning/40 bg-warning/5 p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4 text-warning" /> Sem Diretoria (Gabinete)
                          </h4>
                        </div>
                        <span className="text-xl font-extrabold font-mono text-warning">{cob}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-warning transition-all duration-700" style={{ width: `${cob}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span><Users className="h-3 w-3 inline mr-1" />{semDir.length} servidores</span>
                        <span className="text-success"><CheckCircle className="h-3 w-3 inline mr-1" />{sp} presentes</span>
                        {hasFinancialAccess && folha > 0 && (
                          <span className="text-warning font-mono font-bold">
                            {folha.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ═══ Gráfico + Alertas lado a lado ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Presença vs Ausências por Diretoria
                </h3>
                <DiretoriaBarChart diretorias={diretorias} servidores={servidores} />
              </div>

              {/* Alertas */}
              <div className="space-y-4">
                <AlertCard
                  title="Funções Críticas Descobertas"
                  count={funcoesCriticasDescobertas.length}
                  icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                  color="border-destructive/20 bg-destructive/5 text-destructive"
                  items={funcoesCriticasDescobertas.map(s => `${s.nome} — ${s.status_presenca}`)}
                />
                <AlertCard
                  title="Contratos Vencendo (30 dias)"
                  count={contratosVencendo.length}
                  icon={<Calendar className="h-4 w-4 text-warning" />}
                  color="border-warning/20 bg-warning/5 text-warning"
                  items={contratosVencendo.map(s => `${s.nome} — ${s.data_encerramento_contrato}`)}
                />

                {/* Donuts compactos */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Vínculos</h3>
                  <DonutChart data={vinculoData} colors={vinculoColors} total={stats.total} centerLabel="vínculos" />
                  <div className="space-y-1 mt-2">
                    {vinculoData.slice(0, 4).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[140px]">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: vinculoColors[i % vinculoColors.length] }} />
                          {d.name}
                        </span>
                        <span className="font-mono font-bold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ Quick Access ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/monitor"
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Monitor</p>
                  <p className="text-[10px] text-muted-foreground">Por unidade</p>
                </div>
              </Link>
              <Link
                to="/estrutura"
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Network className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Estrutura</p>
                  <p className="text-[10px] text-muted-foreground">Organização</p>
                </div>
              </Link>
              <Link
                to="/acesso"
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                  <UserCheck className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Acesso Rápido</p>
                  <p className="text-[10px] text-muted-foreground">Gestores</p>
                </div>
              </Link>
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Importar</p>
                <ImportCSVButton onComplete={loadData} />
              </div>
            </div>
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
  const { signOut, user, hasFinancialAccess } = useAuthSession();
  return <DashboardContent signOut={signOut} userEmail={user?.email} hasFinancialAccess={hasFinancialAccess} />;
};

export default Dashboard;
