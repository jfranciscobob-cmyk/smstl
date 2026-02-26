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
            {/* ═══ Executive Hero Banner ═══ */}
            <div className="rounded-2xl gradient-hero p-6 sm:p-8 text-primary-foreground relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: "radial-gradient(circle at 20% 50%, hsl(174 62% 40%), transparent 50%), radial-gradient(circle at 80% 20%, hsl(210 75% 50%), transparent 50%)"
              }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-primary-foreground/60" />
                  <span className="text-[11px] font-semibold text-primary-foreground/60 uppercase tracking-widest">
                    Painel Executivo — {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1">
                  Secretaria Municipal de Saúde
                </h2>
                <p className="text-xs text-primary-foreground/50">Três Lagoas · Visão Geral da Força de Trabalho</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold font-mono">{stats.total}</p>
                    <p className="text-[11px] text-primary-foreground/50 font-medium mt-0.5">Total de Servidores</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold font-mono text-success">{coberturaGeral}%</p>
                    <p className="text-[11px] text-primary-foreground/50 font-medium mt-0.5">Cobertura Presencial</p>
                  </div>
                  {hasFinancialAccess && (
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold font-mono">
                      {folhaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-primary-foreground/50 font-medium mt-0.5">Folha Mensal Estimada</p>
                  </div>
                  )}
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold font-mono">{diretorias.length}</p>
                    <p className="text-[11px] text-primary-foreground/50 font-medium mt-0.5">Diretorias</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ KPI Cards Row ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Presentes"
                value={stats.presentes.toLocaleString("pt-BR")}
                icon={<CheckCircle className="h-5 w-5 text-success" />}
                color="bg-success/10"
                subtitle={`${coberturaGeral}% do total`}
              />
              <KpiCard
                label="Férias"
                value={stats.ferias.toString()}
                icon={<Palmtree className="h-5 w-5 text-warning" />}
                color="bg-warning/10"
              />
              <KpiCard
                label="Afastados"
                value={stats.afastados.toString()}
                icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                color="bg-destructive/10"
              />
              <KpiCard
                label="Concursados"
                value={stats.concursados.toLocaleString("pt-BR")}
                icon={<Shield className="h-5 w-5 text-primary" />}
                color="bg-primary/10"
                subtitle={`${stats.total > 0 ? Math.round((stats.concursados / stats.total) * 100) : 0}%`}
              />
              <KpiCard
                label="Contratados"
                value={stats.contratados.toLocaleString("pt-BR")}
                icon={<Briefcase className="h-5 w-5 text-info" />}
                color="bg-info/10"
              />
              <KpiCard
                label="Unidades"
                value={unidades.length.toString()}
                icon={<MapPin className="h-5 w-5 text-primary" />}
                color="bg-accent"
                href="/monitor"
              />
            </div>

            {/* ═══ Charts Row ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Donut */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Situação dos Servidores</h3>
                <DonutChart data={statusData} colors={statusColors} total={stats.total} centerLabel="servidores" />
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                  {statusData.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[i] }} />
                      {d.name}: <span className="font-mono font-bold text-foreground">{d.value}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Vínculo Donut */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Distribuição por Vínculo</h3>
                <DonutChart data={vinculoData} colors={vinculoColors} total={stats.total} centerLabel="vínculos" />
                <div className="space-y-1.5 mt-3">
                  {vinculoData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[180px]">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: vinculoColors[i % vinculoColors.length] }} />
                        {d.name}
                      </span>
                      <span className="font-mono font-bold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alocação & Alertas */}
              <div className="space-y-4">
                {/* Alocação Progress */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Alocação em Diretorias</h3>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-3xl font-extrabold font-mono text-foreground">{pctAlocados}%</span>
                    <span className="text-xs text-muted-foreground mb-1">{alocados} de {stats.total}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pctAlocados}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {stats.total - alocados} servidores aguardando alocação
                  </p>
                </div>

                {/* Alertas */}
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
              </div>
            </div>

            {/* ═══ Servidores por Diretoria (Bar Chart) ═══ */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Servidores por Diretoria — Presença vs Ausências
                </h3>
                <Link to="/monitor" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <DiretoriaBarChart diretorias={diretorias} servidores={servidores} />
            </div>

            {/* ═══ Quick Access & Tools ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/monitor"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Monitor por Unidade</p>
                  <p className="text-[11px] text-muted-foreground">Acompanhe cada unidade de saúde</p>
                </div>
              </Link>
              <Link
                to="/estrutura"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Estrutura Organizacional</p>
                  <p className="text-[11px] text-muted-foreground">Gerencie diretorias e unidades</p>
                </div>
              </Link>
              <Link
                to="/acesso"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                  <UserCheck className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Acesso Rápido</p>
                  <p className="text-[11px] text-muted-foreground">Visão de diretores e coordenadores</p>
                </div>
              </Link>
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Importar Dados</h3>
                <ImportCSVButton onComplete={loadData} />
              </div>
            </div>

            {/* ═══ Diretorias Overview Table ═══ */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo por Diretoria</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left px-5 py-3 font-semibold">Diretoria</th>
                      <th className="text-center px-3 py-3 font-semibold">Servidores</th>
                      <th className="text-center px-3 py-3 font-semibold">Presentes</th>
                      <th className="text-center px-3 py-3 font-semibold">Cobertura</th>
                      <th className="text-center px-3 py-3 font-semibold">Unidades</th>
                      {hasFinancialAccess && <th className="text-right px-5 py-3 font-semibold">Folha Est.</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {diretorias.map(dir => {
                      const ds = servidores.filter(s => s.diretoria_id === dir.id);
                      const dp = ds.filter(s => s.status_presenca === "presente").length;
                      const du = unidades.filter(u => u.diretoria_id === dir.id).length;
                      const df = ds.reduce((sum, s) => sum + (s.salario || 0), 0);
                      const cob = ds.length > 0 ? Math.round((dp / ds.length) * 100) : 0;
                      const cobColor = cob >= 80 ? "text-success bg-success/10" : cob >= 50 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";
                      return (
                        <tr key={dir.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-semibold text-foreground">{dir.nome}</span>
                          </td>
                          <td className="text-center px-3 py-3 font-mono font-bold text-foreground">{ds.length}</td>
                          <td className="text-center px-3 py-3 font-mono text-success font-bold">{dp}</td>
                          <td className="text-center px-3 py-3">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold font-mono ${cobColor}`}>{cob}%</span>
                          </td>
                          <td className="text-center px-3 py-3 font-mono text-muted-foreground">{du}</td>
                          {hasFinancialAccess && (
                          <td className="text-right px-5 py-3 font-mono text-xs text-muted-foreground">
                            {df.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          )}
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="bg-muted/30 font-bold">
                      <td className="px-5 py-3 text-foreground">TOTAL</td>
                      <td className="text-center px-3 py-3 font-mono text-foreground">{servidores.filter(s => s.diretoria_id).length}</td>
                      <td className="text-center px-3 py-3 font-mono text-success">{servidores.filter(s => s.diretoria_id && s.status_presenca === "presente").length}</td>
                      <td className="text-center px-3 py-3">
                        <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold font-mono bg-primary/10 text-primary">{coberturaGeral}%</span>
                      </td>
                      <td className="text-center px-3 py-3 font-mono text-muted-foreground">{unidades.length}</td>
                      {hasFinancialAccess && (
                      <td className="text-right px-5 py-3 font-mono text-xs text-foreground">
                        {folhaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      )}
                    </tr>
                  </tbody>
                </table>
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
