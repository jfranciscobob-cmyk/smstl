import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeStats, type ServidorDB, type DiretoriaDB, type UnidadeDB } from "@/hooks/useServidores";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Monitor, Lock, ChevronRight, Activity,
} from "lucide-react";

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

// ─── Slide 1: Overview ───
function SlideOverview({ servidores, diretorias }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[] }) {
  const stats = computeStats(servidores);
  const now = new Date();
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const kpis = [
    { label: "Total Servidores", value: stats.total, icon: <Users className="h-8 w-8" />, gradient: "from-slate-600 to-slate-700" },
    { label: "Presentes", value: stats.presentes, icon: <CheckCircle className="h-8 w-8" />, gradient: "from-emerald-600 to-green-700" },
    { label: "Férias", value: stats.ferias, icon: <Palmtree className="h-8 w-8" />, gradient: "from-amber-600 to-orange-700" },
    { label: "Afastados", value: stats.afastados, icon: <AlertTriangle className="h-8 w-8" />, gradient: "from-red-600 to-rose-700" },
    { label: "Ausentes", value: stats.ausentes, icon: <Shield className="h-8 w-8" />, gradient: "from-purple-600 to-violet-700" },
    { label: "Funções Críticas", value: stats.funcoesCriticas, icon: <Activity className="h-8 w-8" />, gradient: "from-cyan-600 to-teal-700" },
  ];

  const presencaPct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

  return (
    <div className="h-full flex flex-col justify-between p-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Secretaria Municipal de Saúde</h1>
            <p className="text-sm text-slate-400 mt-0.5">Painel de Monitoramento em Tempo Real</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extrabold text-teal-400 font-mono">{hora}</p>
          <p className="text-sm text-slate-400 capitalize mt-1">{data}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-5 my-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-2xl bg-gradient-to-br ${kpi.gradient} p-6 shadow-xl`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/80">{kpi.icon}</div>
            </div>
            <p className="text-4xl font-extrabold text-white font-mono">{kpi.value}</p>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mt-2">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Presence bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Taxa de Presença Geral</span>
          <span className="text-3xl font-extrabold text-teal-400 font-mono">{presencaPct}%</span>
        </div>
        <div className="h-6 rounded-full bg-[#1a2744] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-1000 ease-out"
            style={{ width: `${presencaPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">Atualização automática</span>
        </div>
        <span className="text-xs text-slate-600">{diretorias.length} diretorias · SMSTL</span>
      </div>
    </div>
  );
}

// ─── Slide 2: Gráficos de Vínculo ───
function SlideVinculo({ servidores }: { servidores: ServidorDB[] }) {
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

  const vinculoColors = ["#0d9488", "#3b82f6", "#8b5cf6", "#64748b"];
  const statusColors = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="h-full flex flex-col p-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Composição da Força de Trabalho</h2>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-10">
        {/* Vínculo */}
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-300 mb-4">Por Vínculo</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={vinculoData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none">
                  {vinculoData.map((_, i) => <Cell key={i} fill={vinculoColors[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111d33", border: "1px solid #1e3a5f", borderRadius: "12px", fontSize: "13px", color: "#fff" }}
                  formatter={(value: number) => [`${value} servidores`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {vinculoData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: vinculoColors[i] }} />
                <span className="text-sm text-slate-300">{d.name}</span>
                <span className="text-sm font-bold text-white font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-300 mb-4">Por Status de Presença</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none">
                  {statusData.map((_, i) => <Cell key={i} fill={statusColors[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111d33", border: "1px solid #1e3a5f", borderRadius: "12px", fontSize: "13px", color: "#fff" }}
                  formatter={(value: number) => [`${value} servidores`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {statusData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: statusColors[i] }} />
                <span className="text-sm text-slate-300">{d.name}</span>
                <span className="text-sm font-bold text-white font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Indicadores por Diretoria ───
function SlideDiretorias({ servidores, diretorias }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[] }) {
  const dirData = useMemo(() => {
    return diretorias.map(dir => {
      const dirServs = servidores.filter(s => s.diretoria_id === dir.id);
      const presentes = dirServs.filter(s => s.status_presenca === "presente").length;
      const ferias = dirServs.filter(s => s.status_presenca === "ferias").length;
      const afastados = dirServs.filter(s => s.status_presenca === "afastado").length;
      const pct = dirServs.length > 0 ? Math.round((presentes / dirServs.length) * 100) : 0;
      return {
        id: dir.id,
        nome: dir.nome.length > 25 ? dir.nome.substring(0, 23) + "…" : dir.nome,
        total: dirServs.length,
        presentes,
        ferias,
        afastados,
        pct,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [servidores, diretorias]);

  return (
    <div className="h-full flex flex-col p-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Indicadores por Diretoria</h2>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        {dirData.slice(0, 8).map(dir => (
          <div key={dir.id} className="rounded-xl bg-[#111d33] border border-[#1e3a5f] p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white truncate">{dir.nome}</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-teal-400 font-mono">{dir.presentes}</span>
                <span className="text-sm text-slate-500">/ {dir.total}</span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2.5 rounded-full bg-[#1a2744] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${dir.pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{dir.pct}% presença</span>
                <div className="flex gap-3">
                  {dir.ferias > 0 && <span className="text-amber-400">🌴 {dir.ferias}</span>}
                  {dir.afastados > 0 && <span className="text-red-400">⚠️ {dir.afastados}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dirData.length > 8 && (
        <p className="text-xs text-slate-600 text-center mt-3">+ {dirData.length - 8} diretorias adicionais</p>
      )}
    </div>
  );
}

// ─── Slide 4: Bar Chart Diretorias ───
function SlideDiretoriasChart({ servidores, diretorias }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[] }) {
  const data = useMemo(() => {
    return diretorias.map(dir => {
      const dirServs = servidores.filter(s => s.diretoria_id === dir.id);
      const presentes = dirServs.filter(s => s.status_presenca === "presente").length;
      return {
        nome: dir.nome.length > 15 ? dir.nome.substring(0, 13) + "…" : dir.nome,
        presentes,
        ausências: dirServs.length - presentes,
        total: dirServs.length,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [servidores, diretorias]);

  return (
    <div className="h-full flex flex-col p-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Presença por Diretoria</h2>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 13 }} axisLine={false} />
            <YAxis type="category" dataKey="nome" width={140} tick={{ fill: "#cbd5e1", fontSize: 13 }} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#111d33", border: "1px solid #1e3a5f", borderRadius: "12px", color: "#fff", fontSize: "13px" }}
            />
            <Bar dataKey="presentes" name="Presentes" fill="#0d9488" radius={[0, 6, 6, 0]} />
            <Bar dataKey="ausências" name="Ausências" fill="#ef4444" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main TV Mode ───
export default function ModoTV() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("tv_unlocked") === "1");
  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const SLIDE_DURATION = 20000; // 20 seconds per slide
  const TRANSITION_DURATION = 800;
  const TOTAL_SLIDES = 4;

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
    const { data: dirs } = await supabase.from("diretorias").select("*").order("nome");
    setServidores(allServ as ServidorDB[]);
    setDiretorias((dirs ?? []) as DiretoriaDB[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    loadData();
    const interval = setInterval(loadData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [unlocked, loadData]);

  // Auto-rotate slides
  useEffect(() => {
    if (!unlocked || loading) return;
    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % TOTAL_SLIDES);
        setTransitioning(false);
      }, TRANSITION_DURATION);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [unlocked, loading]);

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

  const slides = [
    <SlideOverview key="overview" servidores={servidores} diretorias={diretorias} />,
    <SlideVinculo key="vinculo" servidores={servidores} />,
    <SlideDiretorias key="diretorias" servidores={servidores} diretorias={diretorias} />,
    <SlideDiretoriasChart key="chart" servidores={servidores} diretorias={diretorias} />,
  ];

  return (
    <div className="h-screen w-screen bg-[#0a1628] overflow-hidden relative select-none cursor-none">
      {/* Slide content */}
      <div
        className={`h-full w-full transition-all duration-700 ease-in-out ${
          transitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        }`}
      >
        {slides[currentSlide]}
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setTransitioning(true); setTimeout(() => { setCurrentSlide(i); setTransitioning(false); }, 300); }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              i === currentSlide
                ? "w-8 h-2.5 bg-teal-400"
                : "w-2.5 h-2.5 bg-slate-700 hover:bg-slate-600"
            }`}
          />
        ))}
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
