import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeStats, type ServidorDB, type DiretoriaDB, type UnidadeDB } from "@/hooks/useServidores";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Monitor, Lock, Activity, MapPin, Briefcase, Heart,
} from "lucide-react";

// ─── Animated counter hook ───
function useAnimatedCount(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (target === 0) { setCount(0); return; }
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

// ─── Staggered animation wrapper ───
function AnimatedCard({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
        transition: `opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`,
      }}
    >
      {children}
    </div>
  );
}

const TV_PASSWORD = "S2026";

// ─── Password Gate ───
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [senha, setSenha] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha === TV_PASSWORD) {
      sessionStorage.setItem("tv_unlocked", "1");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 p-10 rounded-3xl bg-[#111d33] border border-[#1e3a5f] shadow-2xl max-w-md w-full mx-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
          <Monitor className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Modo TV</h1>
        <p className="text-sm text-slate-400 text-center">Digite a senha para acessar o painel de monitoramento.</p>
        <div className="w-full space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="password"
              autoFocus
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Senha de acesso..."
              className={`w-full h-12 rounded-xl bg-[#0a1628] border ${error ? "border-red-500 animate-shake" : "border-[#1e3a5f]"} pl-10 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all`}
            />
          </div>
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold text-sm hover:from-teal-500 hover:to-cyan-500 transition-all shadow-lg shadow-teal-600/20"
          >
            Acessar Painel
          </button>
        </div>
        {error && <p className="text-red-400 text-xs animate-pulse">Senha incorreta</p>}
      </form>
    </div>
  );
}

// ─── Clock component ───
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-4xl font-extrabold text-teal-400 font-mono">
        {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-sm text-slate-400 capitalize mt-1">
        {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

// ─── TV Header ───
function TVHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <LiveClock />
    </div>
  );
}

// ─── Mini stat card ───
function MiniStat({ label, value, color, icon, delay = 0 }: { label: string; value: number; color: string; icon: React.ReactNode; delay?: number }) {
  const animatedValue = useAnimatedCount(value);
  return (
    <AnimatedCard delay={delay}>
      <div className={`rounded-xl bg-gradient-to-br ${color} p-4 shadow-lg flex flex-col justify-between min-h-[100px] hover:scale-105 transition-transform duration-300`}>
        <div className="text-white/70">{icon}</div>
        <div>
          <p className="text-3xl font-extrabold text-white font-mono">{animatedValue}</p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{label}</p>
        </div>
      </div>
    </AnimatedCard>
  );
}

// ─── Progress bar ───
function PresenceBar({ pct, label }: { pct: number; label?: string }) {
  const barColor = pct >= 80 ? "from-emerald-500 to-green-400" : pct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400";
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
          <span className="text-lg font-extrabold text-teal-400 font-mono">{pct}%</span>
        </div>
      )}
      <div className="h-3 rounded-full bg-[#1a2744] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE 1: OVERVIEW GERAL
// ═══════════════════════════════════════════════════
function SlideOverview({ servidores, diretorias, unidades }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[]; unidades: UnidadeDB[] }) {
  const stats = computeStats(servidores);
  const presencaPct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

  const kpis = [
    { label: "Total", value: stats.total, icon: <Users className="h-6 w-6" />, color: "from-slate-600 to-slate-700" },
    { label: "Presentes", value: stats.presentes, icon: <CheckCircle className="h-6 w-6" />, color: "from-emerald-600 to-green-700" },
    { label: "Férias", value: stats.ferias, icon: <Palmtree className="h-6 w-6" />, color: "from-amber-600 to-orange-700" },
    { label: "Afastados", value: stats.afastados, icon: <AlertTriangle className="h-6 w-6" />, color: "from-red-600 to-rose-700" },
    { label: "Ausentes", value: stats.ausentes, icon: <Shield className="h-6 w-6" />, color: "from-purple-600 to-violet-700" },
    { label: "Funções Críticas", value: stats.funcoesCriticas, icon: <Activity className="h-6 w-6" />, color: "from-cyan-600 to-teal-700" },
  ];

  return (
    <div className="h-full flex flex-col justify-between p-8">
      <TVHeader title="Secretaria Municipal de Saúde" subtitle="Painel Geral de Monitoramento" icon={<Shield className="h-6 w-6 text-white" />} />

      <div className="grid grid-cols-6 gap-4 my-4">
        {kpis.map((k, i) => <MiniStat key={k.label} {...k} delay={200 + i * 100} />)}
      </div>

      <div className="grid grid-cols-3 gap-6 my-4">
        <div className="col-span-2">
          <PresenceBar pct={presencaPct} label="Taxa de Presença Geral" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-[#111d33] border border-[#1e3a5f] p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Diretorias</p>
              <p className="text-3xl font-extrabold text-white font-mono">{diretorias.length}</p>
            </div>
            <div className="rounded-xl bg-[#111d33] border border-[#1e3a5f] p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unidades de Saúde</p>
              <p className="text-3xl font-extrabold text-white font-mono">{unidades.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#111d33] border border-[#1e3a5f] p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Composição</p>
          <div className="space-y-3">
            {[
              { label: "Concursados", value: stats.concursados, color: "bg-teal-500" },
              { label: "Contratados", value: stats.contratados, color: "bg-blue-500" },
              { label: "Outros", value: stats.total - stats.concursados - stats.contratados, color: "bg-slate-500" },
            ].map(v => (
              <div key={v.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${v.color}`} />
                  <span className="text-sm text-slate-300">{v.label}</span>
                </div>
                <span className="text-sm font-bold text-white font-mono">{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">Dados em tempo real</span>
        </div>
        <span className="text-xs text-slate-600">SMSTL · Modo TV</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE 2: RANKING DIRETORIAS (bar chart)
// ═══════════════════════════════════════════════════
function SlideRankingDiretorias({ servidores, diretorias }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[] }) {
  const data = useMemo(() => {
    return diretorias.map(dir => {
      const ds = servidores.filter(s => s.diretoria_id === dir.id);
      const presentes = ds.filter(s => s.status_presenca === "presente").length;
      const ferias = ds.filter(s => s.status_presenca === "ferias").length;
      const afastados = ds.filter(s => s.status_presenca === "afastado").length;
      const ausentes = ds.length - presentes - ferias - afastados;
      return {
        nome: dir.nome.length > 20 ? dir.nome.substring(0, 18) + "…" : dir.nome,
        Presentes: presentes,
        Férias: ferias,
        Afastados: afastados,
        Ausentes: ausentes > 0 ? ausentes : 0,
        total: ds.length,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [servidores, diretorias]);

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader title="Ranking por Diretoria" subtitle="Distribuição de servidores por status" icon={<Building2 className="h-6 w-6 text-white" />} />
      <div className="flex-1 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
            <YAxis type="category" dataKey="nome" width={160} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} />
            <Tooltip contentStyle={{ background: "#111d33", border: "1px solid #1e3a5f", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }} />
            <Bar dataKey="Presentes" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Férias" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Afastados" stackId="a" fill="#ef4444" />
            <Bar dataKey="Ausentes" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE 3: COMPOSIÇÃO GERAL (pie charts)
// ═══════════════════════════════════════════════════
function SlideComposicao({ servidores }: { servidores: ServidorDB[] }) {
  const stats = computeStats(servidores);

  const vinculoData = [
    { name: "Concursados", value: stats.concursados },
    { name: "Contratados", value: stats.contratados },
    { name: "Estagiários", value: servidores.filter(s => s.vinculo === "ESTAGIARIO").length },
    { name: "Outros", value: stats.total - stats.concursados - stats.contratados - servidores.filter(s => s.vinculo === "ESTAGIARIO").length },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: "Presentes", value: stats.presentes },
    { name: "Férias", value: stats.ferias },
    { name: "Afastados", value: stats.afastados },
    { name: "Ausentes", value: stats.ausentes },
  ].filter(d => d.value > 0);

  const coberturaData = [
    { name: "Integral", value: servidores.filter(s => s.cobertura_prevista === "INTEGRAL").length },
    { name: "Parcial", value: servidores.filter(s => s.cobertura_prevista === "PARCIAL").length },
  ].filter(d => d.value > 0);

  const vinculoColors = ["#0d9488", "#3b82f6", "#8b5cf6", "#64748b"];
  const statusColors = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const coberturaColors = ["#06b6d4", "#f97316"];

  const renderChart = (data: { name: string; value: number }[], colors: string[], title: string) => (
    <div className="flex flex-col items-center">
      <h3 className="text-base font-bold text-slate-300 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#111d33", border: "1px solid #1e3a5f", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="text-xs text-slate-400">{d.name}</span>
            <span className="text-xs font-bold text-white font-mono">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader title="Composição da Força de Trabalho" subtitle="Vínculo, status e cobertura" icon={<Briefcase className="h-6 w-6 text-white" />} />
      <div className="flex-1 grid grid-cols-3 gap-6 mt-4">
        {renderChart(vinculoData, vinculoColors, "Por Vínculo")}
        {renderChart(statusData, statusColors, "Por Status")}
        {renderChart(coberturaData, coberturaColors, "Por Cobertura")}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE DINÂMICO: DETALHE POR DIRETORIA
// ═══════════════════════════════════════════════════
function SlideDiretoriaDetalhe({
  diretoria,
  servidores,
  unidades,
}: {
  diretoria: DiretoriaDB;
  servidores: ServidorDB[];
  unidades: UnidadeDB[];
}) {
  const dirServs = servidores.filter(s => s.diretoria_id === diretoria.id);
  const dirUnidades = unidades.filter(u => u.diretoria_id === diretoria.id);
  const stats = computeStats(dirServs);
  const presencaPct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

  // Dados por unidade
  const unidadeData = dirUnidades.map(uni => {
    const us = dirServs.filter(s => s.unidade_id === uni.id);
    const presentes = us.filter(s => s.status_presenca === "presente").length;
    const pct = us.length > 0 ? Math.round((presentes / us.length) * 100) : 0;
    return { id: uni.id, nome: uni.nome, sigla: uni.sigla, total: us.length, presentes, ferias: us.filter(s => s.status_presenca === "ferias").length, afastados: us.filter(s => s.status_presenca === "afastado").length, pct };
  }).filter(u => u.total > 0).sort((a, b) => b.total - a.total);

  // Servidores sem unidade
  const semUnidade = dirServs.filter(s => !s.unidade_id || !dirUnidades.find(u => u.id === s.unidade_id));
  const semUnidadePresentes = semUnidade.filter(s => s.status_presenca === "presente").length;

  // Composição vínculo da diretoria
  const vinculoData = [
    { name: "Concursados", value: dirServs.filter(s => (s.vinculo || "").includes("CONCURSADO")).length },
    { name: "Contratados", value: dirServs.filter(s => (s.vinculo || "").includes("CONTRATO")).length },
    { name: "Outros", value: dirServs.length - dirServs.filter(s => (s.vinculo || "").includes("CONCURSADO")).length - dirServs.filter(s => (s.vinculo || "").includes("CONTRATO")).length },
  ].filter(d => d.value > 0);
  const vinculoColors = ["#0d9488", "#3b82f6", "#64748b"];

  // Funções críticas nesta diretoria
  const funcCriticas = dirServs.filter(s => s.funcao_critica).length;

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader
        title={diretoria.nome}
        subtitle={`${stats.total} servidores · ${dirUnidades.length} unidades`}
        icon={<Building2 className="h-6 w-6 text-white" />}
      />

      {/* KPIs da diretoria */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <MiniStat label="Total" value={stats.total} color="from-slate-600 to-slate-700" icon={<Users className="h-5 w-5" />} delay={150} />
        <MiniStat label="Presentes" value={stats.presentes} color="from-emerald-600 to-green-700" icon={<CheckCircle className="h-5 w-5" />} delay={250} />
        <MiniStat label="Férias" value={stats.ferias} color="from-amber-600 to-orange-700" icon={<Palmtree className="h-5 w-5" />} delay={350} />
        <MiniStat label="Afastados" value={stats.afastados} color="from-red-600 to-rose-700" icon={<AlertTriangle className="h-5 w-5" />} delay={450} />
        <MiniStat label="Ausentes" value={stats.ausentes} color="from-purple-600 to-violet-700" icon={<Shield className="h-5 w-5" />} delay={550} />
        <MiniStat label="F. Críticas" value={funcCriticas} color="from-cyan-600 to-teal-700" icon={<Activity className="h-5 w-5" />} delay={650} />
      </div>

      <PresenceBar pct={presencaPct} label="Presença da Diretoria" />

      <div className="flex-1 grid grid-cols-3 gap-4 mt-4 overflow-hidden">
        {/* Lista de unidades */}
        <div className="col-span-2 overflow-y-auto tv-auto-scroll space-y-2 pr-2" style={{ scrollbarWidth: "none" }}>
          {unidadeData.map(uni => (
            <div key={uni.id} className="rounded-lg bg-[#111d33] border border-[#1e3a5f] p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a2744] flex-shrink-0">
                  <MapPin className="h-4 w-4 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{uni.sigla} – {uni.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400">{uni.total} servidores</span>
                    {uni.ferias > 0 && <span className="text-xs text-amber-400">🌴 {uni.ferias}</span>}
                    {uni.afastados > 0 && <span className="text-xs text-red-400">⚠️ {uni.afastados}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <div className="w-24">
                  <div className="h-2 rounded-full bg-[#1a2744] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${uni.pct >= 80 ? "from-emerald-500 to-green-400" : uni.pct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400"}`}
                      style={{ width: `${uni.pct}%` }}
                    />
                  </div>
                </div>
                <span className={`text-lg font-extrabold font-mono min-w-[50px] text-right ${uni.pct >= 80 ? "text-emerald-400" : uni.pct >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {uni.pct}%
                </span>
              </div>
            </div>
          ))}

          {semUnidade.length > 0 && (
            <div className="rounded-lg bg-[#111d33] border border-dashed border-[#1e3a5f] p-3 flex items-center justify-between opacity-70">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a2744]">
                  <Users className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400">Sem unidade definida</p>
                  <span className="text-xs text-slate-500">{semUnidade.length} servidores · {semUnidadePresentes} presentes</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composição da diretoria */}
        <div className="rounded-xl bg-[#111d33] border border-[#1e3a5f] p-4 flex flex-col">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Composição</p>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vinculoData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                  {vinculoData.map((_, i) => <Cell key={i} fill={vinculoColors[i % vinculoColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "10px", fontSize: "11px", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {vinculoData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: vinculoColors[i % vinculoColors.length] }} />
                  <span className="text-xs text-slate-400">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE: MAPA DE PRESENÇA POR UNIDADE (todas)
// ═══════════════════════════════════════════════════
function SlideMapaUnidades({ servidores, unidades, diretorias }: { servidores: ServidorDB[]; unidades: UnidadeDB[]; diretorias: DiretoriaDB[] }) {
  const uniData = useMemo(() => {
    return unidades.map(uni => {
      const us = servidores.filter(s => s.unidade_id === uni.id);
      const presentes = us.filter(s => s.status_presenca === "presente").length;
      const pct = us.length > 0 ? Math.round((presentes / us.length) * 100) : 0;
      const dir = diretorias.find(d => d.id === uni.diretoria_id);
      return { id: uni.id, sigla: uni.sigla, nome: uni.nome, total: us.length, presentes, pct, diretoria: dir?.nome || "—" };
    }).filter(u => u.total > 0).sort((a, b) => a.pct - b.pct);
  }, [servidores, unidades, diretorias]);

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader title="Mapa de Presença por Unidade" subtitle={`${uniData.length} unidades ativas`} icon={<MapPin className="h-6 w-6 text-white" />} />
      <div className="flex-1 overflow-y-auto tv-auto-scroll pr-2" style={{ scrollbarWidth: "none" }}>
        <div className="grid grid-cols-4 gap-3">
          {uniData.map((uni, i) => (
            <AnimatedCard key={uni.id} delay={100 + i * 50}>
              <div className="rounded-xl bg-[#111d33] border border-[#1e3a5f] p-3 hover:border-teal-500/30 transition-colors duration-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-400 uppercase">{uni.sigla}</span>
                  <span className={`text-lg font-extrabold font-mono ${uni.pct >= 80 ? "text-emerald-400" : uni.pct >= 60 ? "text-amber-400" : "text-red-400"}`}>{uni.pct}%</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mb-2">{uni.nome}</p>
                <div className="h-1.5 rounded-full bg-[#1a2744] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${uni.pct >= 80 ? "from-emerald-500 to-green-400" : uni.pct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400"}`}
                    style={{ width: `${uni.pct}%`, transition: "width 1s ease-out" }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-slate-500">{uni.presentes}/{uni.total}</span>
                  <span className="text-[10px] text-slate-600 truncate ml-2">{uni.diretoria}</span>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN TV MODE
// ═══════════════════════════════════════════════════
export default function ModoTV() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("tv_unlocked") === "1");
  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const SLIDE_DURATION = 20000;
  const TRANSITION_DURATION = 800;

  const loadData = useCallback(async () => {
    const PAGE = 1000;
    let offset = 0;
    let allServ: any[] = [];
    while (true) {
      const { data, error } = await supabase.from("servidores").select("*").order("nome").range(offset, offset + PAGE - 1);
      if (error || !data || data.length === 0) break;
      allServ = allServ.concat(data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    const [{ data: dirs }, { data: unis }] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
    ]);
    setServidores(allServ as ServidorDB[]);
    setDiretorias((dirs ?? []) as DiretoriaDB[]);
    setUnidades((unis ?? []) as UnidadeDB[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [unlocked, loadData]);

  // Build slides dynamically
  const slides = useMemo(() => {
    if (loading) return [];
    const s: React.ReactNode[] = [];

    // 1. Overview
    s.push(<SlideOverview key="overview" servidores={servidores} diretorias={diretorias} unidades={unidades} />);

    // 2. Ranking
    s.push(<SlideRankingDiretorias key="ranking" servidores={servidores} diretorias={diretorias} />);

    // 3. Composição
    s.push(<SlideComposicao key="composicao" servidores={servidores} />);

    // 4. Slides individuais por diretoria (apenas com servidores)
    const dirsComServs = diretorias.filter(d => servidores.some(s => s.diretoria_id === d.id));
    dirsComServs.forEach(dir => {
      s.push(<SlideDiretoriaDetalhe key={`dir-${dir.id}`} diretoria={dir} servidores={servidores} unidades={unidades} />);
    });

    // Último: Mapa de unidades
    s.push(<SlideMapaUnidades key="mapa" servidores={servidores} unidades={unidades} diretorias={diretorias} />);

    return s;
  }, [servidores, diretorias, unidades, loading]);

  const TOTAL_SLIDES = slides.length;

  // Auto-rotate
  useEffect(() => {
    if (!unlocked || loading || TOTAL_SLIDES === 0) return;
    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % TOTAL_SLIDES);
        setTransitioning(false);
      }, TRANSITION_DURATION);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [unlocked, loading, TOTAL_SLIDES]);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center animate-pulse">
            <Monitor className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0a1628] overflow-hidden relative select-none cursor-none">
      <div
        className={`h-full w-full transition-all duration-700 ease-in-out ${
          transitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        }`}
      >
        {slides[currentSlide]}
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setTransitioning(true); setTimeout(() => { setCurrentSlide(i); setTransitioning(false); }, 300); }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              i === currentSlide
                ? "w-6 h-2 bg-teal-400"
                : "w-2 h-2 bg-slate-700 hover:bg-slate-600"
            }`}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-4 right-6 text-xs text-slate-600 font-mono">
        {currentSlide + 1} / {TOTAL_SLIDES}
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#111d33]">
        <div
          key={currentSlide}
          className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 animate-tv-progress"
          style={{ animationDuration: `${SLIDE_DURATION}ms` }}
        />
      </div>
    </div>
  );
}
