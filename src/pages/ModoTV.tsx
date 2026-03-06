import { useState, useEffect, useMemo, useCallback, useRef, type RefObject } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { computeStats, type ServidorDB, type DiretoriaDB, type UnidadeDB, type AtestadoDB, type AfastamentoDB, type FaltaAbonadaDB } from "@/hooks/useServidores";
import { applyAutoPresenca, type EscalaSemanalRow } from "@/lib/presencaAutomatica";
import { isAfastadoLikeStatus } from "@/lib/presencaStatus";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  Users, CheckCircle, Palmtree, AlertTriangle, Shield, Building2, Monitor, Lock, Activity, MapPin, Briefcase,
  TrendingUp, Zap, Eye, Clock, UserCheck, FileText, Calendar, Megaphone,
} from "lucide-react";

// ─── Animated counter hook ───
function useAnimatedCount(target: number, duration = 1400) {
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
      const eased = 1 - Math.pow(1 - progress, 4); // quartic ease-out
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
        transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.92)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── JS-based smooth auto-scroll for TV panels ───
function useAutoScroll(duration = 28000): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset scroll on mount
    el.scrollTop = 0;
    // Wait a moment then check if scrollable
    const startDelay = setTimeout(() => {
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 5) return; // No need to scroll
      // Scroll down slowly over most of the duration, pause at ends
      const pauseTime = duration * 0.12; // 12% pause at top and bottom
      const scrollTime = duration - pauseTime * 2;
      let raf: number;
      let startTime: number | null = null;
      const animate = (now: number) => {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        const currentMax = el.scrollHeight - el.clientHeight;
        if (currentMax <= 0) return;
        if (elapsed < pauseTime) {
          // Pause at top
          el.scrollTop = 0;
        } else if (elapsed < pauseTime + scrollTime) {
          // Smooth scroll down
          const scrollProgress = (elapsed - pauseTime) / scrollTime;
          const eased = scrollProgress < 0.5
            ? 2 * scrollProgress * scrollProgress
            : 1 - Math.pow(-2 * scrollProgress + 2, 2) / 2;
          el.scrollTop = eased * currentMax;
        } else {
          // Pause at bottom
          el.scrollTop = currentMax;
        }
        if (elapsed < duration) {
          raf = requestAnimationFrame(animate);
        }
      };
      raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    }, 600);
    return () => clearTimeout(startDelay);
  }, [duration]);
  return ref;
}

// ─── ScrollContainer component for TV slides ───
function TVScrollArea({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useAutoScroll(28000);
  return (
    <div ref={scrollRef} className={`tv-auto-scroll ${className}`} style={{ scrollbarWidth: "none" }}>
      {children}
    </div>
  );
}

// ─── Animated radial gauge ───
function RadialGauge({ pct, size = 120, strokeWidth = 10, label }: { pct: number; size?: number; strokeWidth?: number; label?: string }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animPct / 100) * circumference;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const glowColor = pct >= 80 ? "rgba(16,185,129,0.3)" : pct >= 60 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a2744" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)", filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white font-mono" style={{ textShadow: `0 0 20px ${glowColor}` }}>
            {animPct}%
          </span>
        </div>
      </div>
      {label && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>}
    </div>
  );
}

// ─── Glowing card border ───
function GlowCard({ children, className = "", color = "teal" }: { children: React.ReactNode; className?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    teal: "from-teal-500/20 via-transparent to-cyan-500/20",
    emerald: "from-emerald-500/20 via-transparent to-green-500/20",
    amber: "from-amber-500/20 via-transparent to-orange-500/20",
    red: "from-red-500/20 via-transparent to-rose-500/20",
    purple: "from-purple-500/20 via-transparent to-violet-500/20",
  };
  return (
    <div className={`relative group ${className}`}>
      <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-r ${colorMap[color] || colorMap.teal} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />
      <div className="relative rounded-2xl bg-[#0f1a2e]/90 border border-[#1e3a5f]/60 backdrop-blur-sm overflow-hidden">
        {children}
      </div>
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
    <div className="min-h-screen bg-[#060e1a] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <form onSubmit={handleSubmit} className="relative flex flex-col items-center gap-6 p-10 rounded-3xl bg-[#0a1628]/80 border border-[#1e3a5f]/50 shadow-2xl backdrop-blur-xl max-w-md w-full mx-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
          <Monitor className="h-10 w-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">Modo TV</h1>
          <p className="text-sm text-slate-500 mt-2">Painel de monitoramento em tempo real</p>
        </div>
        <div className="w-full space-y-3">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="password"
              autoFocus
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Senha de acesso..."
              className={`w-full h-14 rounded-2xl bg-[#0a1628] border ${error ? "border-red-500 animate-shake" : "border-[#1e3a5f]"} pl-12 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 transition-all`}
            />
          </div>
          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-sm hover:from-teal-500 hover:to-cyan-500 transition-all shadow-xl shadow-teal-600/20 active:scale-[0.98]"
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
const TZ_OPTIONS = { timeZone: "America/Campo_Grande" } as const;

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-right flex items-center gap-5">
      <div>
        <p className="text-4xl font-black text-white font-mono tracking-tighter" style={{ textShadow: "0 0 30px rgba(20,184,166,0.3)" }}>
          {now.toLocaleTimeString("pt-BR", { ...TZ_OPTIONS, hour: "2-digit", minute: "2-digit" })}
          <span className="text-xl text-teal-400/60 ml-0.5">:{now.toLocaleTimeString("pt-BR", { ...TZ_OPTIONS, second: "2-digit" }).slice(-2)}</span>
        </p>
        <p className="text-xs text-slate-500 capitalize mt-1 tracking-wide">
          {now.toLocaleDateString("pt-BR", { ...TZ_OPTIONS, weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
      </div>
    </div>
  );
}

// ─── TV Header ───
function TVHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-xl shadow-teal-500/25">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <LiveClock />
    </div>
  );
}

// ─── KPI Card (premium) ───
function KPICard({ label, value, icon, gradient, delay = 0, suffix }: { label: string; value: number; icon: React.ReactNode; gradient: string; delay?: number; suffix?: string }) {
  const animatedValue = useAnimatedCount(value);
  return (
    <AnimatedCard delay={delay}>
      <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-xl overflow-hidden group hover:scale-[1.03] transition-transform duration-300`}>
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white/50">{icon}</div>
            <TrendingUp className="h-3.5 w-3.5 text-white/20" />
          </div>
          <p className="text-4xl font-black text-white font-mono tracking-tighter">
            {animatedValue.toLocaleString("pt-BR")}
            {suffix && <span className="text-lg text-white/50 ml-1">{suffix}</span>}
          </p>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2">{label}</p>
        </div>
      </div>
    </AnimatedCard>
  );
}

// ─── Progress bar (enhanced) ───
function PresenceBar({ pct, label }: { pct: number; label?: string }) {
  const barColor = pct >= 80 ? "from-emerald-500 to-green-400" : pct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400";
  const glowColor = pct >= 80 ? "shadow-emerald-500/20" : pct >= 60 ? "shadow-amber-500/20" : "shadow-red-500/20";
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
          <span className="text-2xl font-black text-white font-mono">{pct}<span className="text-sm text-slate-500">%</span></span>
        </div>
      )}
      <div className="h-3 rounded-full bg-[#1a2744] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-lg ${glowColor} transition-all duration-[1.5s] ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Unit row (enhanced) ───
function UnitRow({ sigla, nome, total, presentes, ferias, afastados, pct, delay = 0 }: {
  sigla: string; nome: string; total: number; presentes: number; ferias: number; afastados: number; pct: number; delay?: number;
}) {
  const barColor = pct >= 80 ? "from-emerald-500 to-green-400" : pct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400";
  const textColor = pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <AnimatedCard delay={delay}>
      <div className="rounded-xl bg-[#0f1a2e]/80 border border-[#1e3a5f]/40 p-3.5 flex items-center justify-between hover:border-teal-500/30 hover:bg-[#111d33] transition-all duration-300 group">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 flex-shrink-0 group-hover:from-teal-500/20 group-hover:to-cyan-500/20 transition-colors">
            <MapPin className="h-4 w-4 text-teal-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{sigla} – {nome}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-slate-500">{total} servidores</span>
              {ferias > 0 && <span className="text-[11px] text-amber-400/80 flex items-center gap-1"><Palmtree className="h-3 w-3" />{ferias}</span>}
              {afastados > 0 && <span className="text-[11px] text-red-400/80 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{afastados}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 ml-3">
          <div className="w-28">
            <div className="h-2 rounded-full bg-[#1a2744] overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${pct}%`, transition: "width 1.2s ease-out" }} />
            </div>
          </div>
          <span className={`text-xl font-black font-mono min-w-[55px] text-right ${textColor}`}>
            {pct}<span className="text-xs text-slate-600">%</span>
          </span>
        </div>
      </div>
    </AnimatedCard>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE 1: OVERVIEW GERAL
// ═══════════════════════════════════════════════════
function SlideOverview({ servidores, diretorias, unidades }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[]; unidades: UnidadeDB[] }) {
  const stats = computeStats(servidores);
  const presencaPct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

  const kpis = [
    { label: "Total", value: stats.total, icon: <Users className="h-6 w-6" />, gradient: "from-slate-700/90 to-slate-800/90" },
    { label: "Presentes", value: stats.presentes, icon: <CheckCircle className="h-6 w-6" />, gradient: "from-emerald-600/90 to-green-800/90" },
    { label: "Férias", value: stats.ferias, icon: <Palmtree className="h-6 w-6" />, gradient: "from-amber-600/90 to-orange-800/90" },
    { label: "Afastados", value: stats.afastados, icon: <AlertTriangle className="h-6 w-6" />, gradient: "from-red-600/90 to-rose-800/90" },
    { label: "Ausentes", value: stats.ausentes, icon: <Shield className="h-6 w-6" />, gradient: "from-purple-600/90 to-violet-800/90" },
    { label: "Funções Críticas", value: stats.funcoesCriticas, icon: <Activity className="h-6 w-6" />, gradient: "from-cyan-600/90 to-teal-800/90" },
  ];

  return (
    <div className="h-full flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <TVHeader title="Secretaria Municipal de Saúde" subtitle="Painel Geral de Monitoramento" icon={<Shield className="h-7 w-7 text-white" />} />

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 my-3">
        {kpis.map((k, i) => <KPICard key={k.label} {...k} delay={200 + i * 120} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 my-3 flex-1 overflow-hidden">
        {/* Left: Presence + details */}
        <div className="hidden md:flex col-span-5 flex-col gap-4">
          <GlowCard color="teal" className="flex-1">
            <div className="p-5 flex flex-col items-center justify-center h-full">
              <RadialGauge pct={presencaPct} size={150} strokeWidth={12} label="Taxa de Presença" />
            </div>
          </GlowCard>
        </div>

        {/* Center: Presença por diretoria */}
        <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
          <GlowCard>
            <div className="p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Presença por Diretoria</p>
              <div className="space-y-3">
                {diretorias
                  .map(dir => {
                    const ds = servidores.filter(s => s.diretoria_id === dir.id);
                    const p = ds.filter(s => s.status_presenca === "presente").length;
                    const dpct = ds.length > 0 ? Math.round((p / ds.length) * 100) : 0;
                    return { ...dir, total: ds.length, presentes: p, dpct };
                  })
                  .filter(d => d.total > 0)
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5)
                  .map(dir => (
                    <div key={dir.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-400 truncate max-w-[180px]">{dir.nome}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{dir.presentes}/{dir.total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#1a2744] overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${dir.dpct >= 80 ? "from-emerald-500 to-green-400" : dir.dpct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400"}`}
                            style={{ width: `${dir.dpct}%`, transition: "width 1.5s ease-out" }}
                          />
                        </div>
                        <span className={`text-xs font-black font-mono min-w-[32px] text-right ${dir.dpct >= 80 ? "text-emerald-400" : dir.dpct >= 60 ? "text-amber-400" : "text-red-400"}`}>{dir.dpct}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Right: Composition */}
        <div className="hidden md:flex col-span-3 flex-col gap-3">
          <GlowCard className="flex-1">
            <div className="p-4 h-full flex flex-col">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Estrutura</p>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {[
                  { label: "Diretorias", value: diretorias.length, icon: <Building2 className="h-4 w-4" />, color: "text-teal-400" },
                  { label: "Unidades", value: unidades.length, icon: <MapPin className="h-4 w-4" />, color: "text-cyan-400" },
                  { label: "Concursados", value: stats.concursados, icon: <Shield className="h-4 w-4" />, color: "text-emerald-400" },
                  { label: "Contratados", value: stats.contratados, icon: <Briefcase className="h-4 w-4" />, color: "text-blue-400" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={item.color}>{item.icon}</span>
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                    <span className="text-lg font-black text-white font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1e3a5f]/40">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600 uppercase tracking-widest">SMSTL · Modo TV</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-slate-600" />
          <span className="text-[10px] text-slate-600 font-mono">Atualização a cada 60s</span>
        </div>
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
        nome: dir.nome.length > 25 ? dir.nome.substring(0, 23) + "…" : dir.nome,
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
      <TVHeader title="Ranking por Diretoria" subtitle="Distribuição de servidores por status" icon={<Building2 className="h-7 w-7 text-white" />} />
      <div className="flex-1 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f40" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nome" width={180} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "16px", color: "#fff", fontSize: "12px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
              cursor={{ fill: "rgba(20,184,166,0.05)" }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em" }} />
            <Bar dataKey="Presentes" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Férias" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Afastados" stackId="a" fill="#ef4444" />
            <Bar dataKey="Ausentes" stackId="a" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE 3: SITUAÇÃO DO EFETIVO (redesigned)
// ═══════════════════════════════════════════════════
function SlideComposicao({ servidores, diretorias }: { servidores: ServidorDB[]; diretorias: DiretoriaDB[] }) {
  const stats = computeStats(servidores);
  const presencaPct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;
  const feriasPct = stats.total > 0 ? Math.round((stats.ferias / stats.total) * 100) : 0;
  const afastadosPct = stats.total > 0 ? Math.round((stats.afastados / stats.total) * 100) : 0;
  const ausentesPct = stats.total > 0 ? Math.round((stats.ausentes / stats.total) * 100) : 0;
  const folgaPct = stats.total > 0 ? Math.round((stats.folga / stats.total) * 100) : 0;

  const estagiarios = servidores.filter(s => s.vinculo === "ESTAGIARIO").length;
  const outros = stats.total - stats.concursados - stats.contratados - estagiarios;

  // Vínculo breakdown with percentages
  const vinculoItems = [
    { label: "Concursados", value: stats.concursados, pct: stats.total > 0 ? Math.round((stats.concursados / stats.total) * 100) : 0, color: "from-teal-500 to-teal-400", dot: "bg-teal-400" },
    { label: "Contratados", value: stats.contratados, pct: stats.total > 0 ? Math.round((stats.contratados / stats.total) * 100) : 0, color: "from-blue-500 to-blue-400", dot: "bg-blue-400" },
    { label: "Estagiários", value: estagiarios, pct: stats.total > 0 ? Math.round((estagiarios / stats.total) * 100) : 0, color: "from-violet-500 to-violet-400", dot: "bg-violet-400" },
    ...(outros > 0 ? [{ label: "Outros", value: outros, pct: stats.total > 0 ? Math.round((outros / stats.total) * 100) : 0, color: "from-slate-500 to-slate-400", dot: "bg-slate-400" }] : []),
  ];

  // Situation breakdown  
  const situacaoItems = [
    { label: "Presentes", value: stats.presentes, pct: presencaPct, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle className="h-5 w-5" /> },
    { label: "Férias", value: stats.ferias, pct: feriasPct, color: "text-amber-400", bg: "bg-amber-500/10", icon: <Palmtree className="h-5 w-5" /> },
    { label: "Afastados", value: stats.afastados, pct: afastadosPct, color: "text-red-400", bg: "bg-red-500/10", icon: <AlertTriangle className="h-5 w-5" /> },
    { label: "Ausentes", value: stats.ausentes, pct: ausentesPct, color: "text-purple-400", bg: "bg-purple-500/10", icon: <Shield className="h-5 w-5" /> },
    { label: "Folga", value: stats.folga, pct: folgaPct, color: "text-slate-400", bg: "bg-slate-500/10", icon: <Clock className="h-5 w-5" /> },
  ];

  // Top 3 diretorias by headcount
  const topDirs = useMemo(() => {
    return diretorias.map(d => {
      const count = servidores.filter(s => s.diretoria_id === d.id).length;
      return { nome: d.nome, count };
    }).filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [servidores, diretorias]);

  return (
    <div className="h-full flex flex-col p-6 lg:p-8">
      <TVHeader title="Situação do Efetivo" subtitle={`${stats.total} servidores ativos na rede municipal`} icon={<Users className="h-7 w-7 text-white" />} />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 mt-4 overflow-hidden">
        {/* LEFT: Situation cards */}
        <div className="col-span-1 md:col-span-5 flex flex-col gap-3">
          <AnimatedCard delay={100}>
            <GlowCard color="emerald">
              <div className="p-4 lg:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Situação Atual dos Servidores</p>
                <div className="space-y-3">
                  {situacaoItems.map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color} flex-shrink-0`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400 font-medium">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-black font-mono ${item.color}`}>{item.value}</span>
                            <span className="text-[10px] text-slate-600 font-mono">({item.pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1a2744] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.bg.replace("/10", "")} opacity-80`}
                            style={{ width: `${item.pct}%`, transition: "width 1.5s ease-out", background: item.color.includes("emerald") ? "#10b981" : item.color.includes("amber") ? "#f59e0b" : item.color.includes("red") ? "#ef4444" : item.color.includes("purple") ? "#8b5cf6" : "#64748b" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </AnimatedCard>
        </div>

        {/* CENTER: Vínculo breakdown */}
        <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
          <AnimatedCard delay={300}>
            <GlowCard color="teal">
              <div className="p-4 lg:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Tipo de Vínculo</p>
                <div className="space-y-4">
                  {vinculoItems.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${item.dot} shadow-lg`} style={{ boxShadow: `0 0 8px currentColor` }} />
                          <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-white font-mono">{item.value}</span>
                          <span className="text-xs text-slate-500 font-mono">{item.pct}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#1a2744] overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                          style={{ width: `${item.pct}%`, transition: "width 1.5s ease-out" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Funções críticas destaque */}
                <div className="mt-5 pt-4 border-t border-[#1e3a5f]/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span className="text-xs text-slate-400 font-medium">Funções Críticas</span>
                    </div>
                    <span className="text-xl font-black text-amber-400 font-mono">{stats.funcoesCriticas}</span>
                  </div>
                </div>
              </div>
            </GlowCard>
          </AnimatedCard>
        </div>

        {/* RIGHT: Maiores pastas + gauges */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-3">
          <AnimatedCard delay={500}>
            <GlowCard color="purple">
              <div className="p-4 lg:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Maiores Diretorias</p>
                <div className="space-y-3">
                  {topDirs.map((d, i) => (
                    <div key={d.nome} className="flex items-center gap-3">
                      <span className="text-lg font-black text-teal-400/50 font-mono w-6">{i + 1}º</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate font-medium">{d.nome}</p>
                        <p className="text-[10px] text-slate-500">{d.count} servidores</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </AnimatedCard>

          <AnimatedCard delay={650}>
            <GlowCard color="teal">
              <div className="p-4 flex items-center justify-center">
                <RadialGauge pct={presencaPct} size={110} strokeWidth={10} label="Presença Geral" />
              </div>
            </GlowCard>
          </AnimatedCard>
        </div>
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
  coordenadoresUnidades = [],
}: {
  diretoria: DiretoriaDB;
  servidores: ServidorDB[];
  unidades: UnidadeDB[];
  coordenadoresUnidades?: { servidor_id: string; unidade_id: string }[];
}) {
  const dirServs = servidores.filter(s => s.diretoria_id === diretoria.id);
  const dirUnidades = unidades.filter(u => u.diretoria_id === diretoria.id);
  const stats = computeStats(dirServs);
  const coordIds = new Set(coordenadoresUnidades.filter(cu => dirUnidades.some(u => u.id === cu.unidade_id)).map(cu => cu.servidor_id));
  const presencaPct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

  const unidadeData = dirUnidades.map(uni => {
    const us = dirServs.filter(s => s.unidade_id === uni.id);
    const presentes = us.filter(s => s.status_presenca === "presente").length;
    const pct = us.length > 0 ? Math.round((presentes / us.length) * 100) : 0;
    return { id: uni.id, nome: uni.nome, sigla: uni.sigla, total: us.length, presentes, ferias: us.filter(s => s.status_presenca === "ferias").length, afastados: us.filter(s => s.status_presenca === "afastado").length, pct };
  }).filter(u => u.total > 0).sort((a, b) => b.total - a.total);

  const semUnidade = dirServs.filter(s => !s.unidade_id || !dirUnidades.find(u => u.id === s.unidade_id));
  const funcCriticas = dirServs.filter(s => s.funcao_critica).length;

  const vinculoData = [
    { name: "Concursados", value: dirServs.filter(s => (s.vinculo || "").includes("CONCURSADO")).length },
    { name: "Contratados", value: dirServs.filter(s => (s.vinculo || "").includes("CONTRATO")).length },
    { name: "Outros", value: dirServs.length - dirServs.filter(s => (s.vinculo || "").includes("CONCURSADO")).length - dirServs.filter(s => (s.vinculo || "").includes("CONTRATO")).length },
  ].filter(d => d.value > 0);
  const vinculoColors = ["#0d9488", "#3b82f6", "#475569"];

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
      <TVHeader
        title={diretoria.nome}
        subtitle={`${stats.total} servidores · ${dirUnidades.length} unidades · ${coordIds.size} coordenadores`}
        icon={<Building2 className="h-7 w-7 text-white" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <KPICard label="Total" value={stats.total} gradient="from-slate-700/90 to-slate-800/90" icon={<Users className="h-5 w-5" />} delay={150} />
        <KPICard label="Presentes" value={stats.presentes} gradient="from-emerald-600/90 to-green-800/90" icon={<CheckCircle className="h-5 w-5" />} delay={250} />
        <KPICard label="Férias" value={stats.ferias} gradient="from-amber-600/90 to-orange-800/90" icon={<Palmtree className="h-5 w-5" />} delay={350} />
        <KPICard label="Afastados" value={stats.afastados} gradient="from-red-600/90 to-rose-800/90" icon={<AlertTriangle className="h-5 w-5" />} delay={450} />
        <KPICard label="Ausentes" value={stats.ausentes} gradient="from-purple-600/90 to-violet-800/90" icon={<Shield className="h-5 w-5" />} delay={550} />
        <KPICard label="F. Críticas" value={funcCriticas} gradient="from-cyan-600/90 to-teal-800/90" icon={<Activity className="h-5 w-5" />} delay={650} />
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Gauge */}
        <div className="hidden md:flex col-span-2 flex-col items-center justify-center">
          <RadialGauge pct={presencaPct} size={140} strokeWidth={12} label="Presença" />
        </div>

        {/* Center: Unit list */}
        <TVScrollArea className="col-span-1 md:col-span-7 overflow-y-auto space-y-2 pr-2">
          {unidadeData.map((uni, i) => (
            <UnitRow key={uni.id} {...uni} delay={200 + i * 80} />
          ))}

          {semUnidade.length > 0 && (
            <AnimatedCard delay={200 + unidadeData.length * 80}>
              <div className="rounded-xl bg-[#0f1a2e]/50 border border-dashed border-[#1e3a5f]/30 p-3 flex items-center gap-3 opacity-60">
                <Users className="h-4 w-4 text-slate-600" />
                <span className="text-xs text-slate-500">{semUnidade.length} sem unidade · {semUnidade.filter(s => s.status_presenca === "presente").length} presentes</span>
              </div>
            </AnimatedCard>
          )}
        </TVScrollArea>

        {/* Right: Composition */}
        <div className="hidden md:block col-span-3">
          <GlowCard className="h-full">
            <div className="p-4 h-full flex flex-col">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Composição</p>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vinculoData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value" stroke="none">
                      {vinculoData.map((_, i) => <Cell key={i} fill={vinculoColors[i % vinculoColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "12px", fontSize: "11px", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-2">
                {vinculoData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: vinculoColors[i], boxShadow: `0 0 8px ${vinculoColors[i]}40` }} />
                      <span className="text-[11px] text-slate-400">{d.name}</span>
                    </div>
                    <span className="text-xs font-black text-white font-mono">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE: DIRETORIA - LISTA DE SERVIDORES POR STATUS
// ═══════════════════════════════════════════════════
function SlideDiretoriaServidores({
  diretoria,
  servidores,
  status,
  statusLabel,
  statusIcon,
  statusColor,
}: {
  diretoria: DiretoriaDB;
  servidores: ServidorDB[];
  status: string;
  statusLabel: string;
  statusIcon: React.ReactNode;
  statusColor: string;
}) {
  const dirServs = servidores.filter(s => s.diretoria_id === diretoria.id && s.status_presenca === status);

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader
        title={`${diretoria.nome}`}
        subtitle={`${statusLabel} — ${dirServs.length} servidores`}
        icon={statusIcon}
      />
      <TVScrollArea className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dirServs.map((s, i) => (
            <AnimatedCard key={s.id} delay={80 + i * 30}>
              <div className={`rounded-xl bg-[#0f1a2e]/80 border border-[#1e3a5f]/40 p-3.5 hover:border-teal-500/30 transition-all`}>
                <p className="text-sm font-bold text-white truncate">{s.nome}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.cargo}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusColor}`}>{statusLabel}</span>
                  <span className="text-slate-600">{s.vinculo}</span>
                </div>
                {s.escala_inicio1 && (
                  <p className="text-[10px] text-slate-600 mt-1 font-mono">{s.escala_inicio1}–{s.escala_fim1}</p>
                )}
              </div>
            </AnimatedCard>
          ))}
        </div>
        {dirServs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-600 text-lg">Nenhum servidor com status "{statusLabel}"</p>
          </div>
        )}
      </TVScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE: DIRETORIA - CONTRATOS E ALERTAS
// ═══════════════════════════════════════════════════
function SlideDiretoriaAlertas({
  diretoria,
  servidores,
}: {
  diretoria: DiretoriaDB;
  servidores: ServidorDB[];
}) {
  const dirServs = servidores.filter(s => s.diretoria_id === diretoria.id);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const contratosVencendo = dirServs.filter(s => {
    if (!s.data_encerramento_contrato) return false;
    const d = new Date(s.data_encerramento_contrato);
    return d >= now && d <= in30;
  });

  const feriasVencidas = dirServs.filter(s => (s.ferias_vencidas ?? 0) > 0);
  const semEscala = dirServs.filter(s => !s.escala_inicio1 && !s.escala_total_horas);
  const funcoesCriticasAusentes = dirServs.filter(s => s.funcao_critica && s.status_presenca !== "presente");

  const alerts = [
    { label: "Contratos Vencendo (30d)", items: contratosVencendo, color: "from-red-600/90 to-rose-800/90", icon: <FileText className="h-5 w-5 text-white" /> },
    { label: "Férias Vencidas", items: feriasVencidas, color: "from-amber-600/90 to-orange-800/90", icon: <Calendar className="h-5 w-5 text-white" /> },
    { label: "Sem Escala Cadastrada", items: semEscala, color: "from-slate-600/90 to-slate-800/90", icon: <Clock className="h-5 w-5 text-white" /> },
    { label: "Funções Críticas Ausentes", items: funcoesCriticasAusentes, color: "from-purple-600/90 to-violet-800/90", icon: <Activity className="h-5 w-5 text-white" /> },
  ].filter(a => a.items.length > 0);

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader
        title={`Alertas — ${diretoria.nome}`}
        subtitle={`${alerts.length} alertas ativos`}
        icon={<AlertTriangle className="h-7 w-7 text-white" />}
      />
      <TVScrollArea className="flex-1 overflow-y-auto space-y-4">
        {alerts.map((alert, ai) => (
          <AnimatedCard key={alert.label} delay={200 + ai * 150}>
            <GlowCard color={ai === 0 ? "red" : ai === 1 ? "amber" : "teal"}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${alert.color}`}>
                    {alert.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{alert.label}</p>
                    <p className="text-[10px] text-slate-500">{alert.items.length} servidor{alert.items.length > 1 ? "es" : ""}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {alert.items.slice(0, 12).map(s => (
                    <div key={s.id} className="rounded-lg bg-[#0a1628]/80 border border-[#1e3a5f]/30 p-2">
                      <p className="text-[11px] font-bold text-white truncate">{s.nome}</p>
                      <p className="text-[9px] text-slate-600 truncate">{s.cargo}</p>
                    </div>
                  ))}
                  {alert.items.length > 12 && (
                    <div className="rounded-lg bg-[#0a1628]/50 border border-dashed border-[#1e3a5f]/30 p-2 flex items-center justify-center">
                      <span className="text-[10px] text-slate-600">+{alert.items.length - 12} mais</span>
                    </div>
                  )}
                </div>
              </div>
            </GlowCard>
          </AnimatedCard>
        ))}
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <CheckCircle className="h-16 w-16 text-emerald-500/30" />
            <p className="text-emerald-400 text-lg font-bold">Sem alertas ativos</p>
            <p className="text-slate-600 text-sm">Tudo sob controle nesta diretoria</p>
          </div>
        )}
      </TVScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE: DIRETORIA - COORDENADORES POR UNIDADE
// ═══════════════════════════════════════════════════
function SlideDiretoriaCoordenadores({
  diretoria,
  servidores,
  unidades,
  coordenadoresUnidades,
}: {
  diretoria: DiretoriaDB;
  servidores: ServidorDB[];
  unidades: UnidadeDB[];
  coordenadoresUnidades: { servidor_id: string; unidade_id: string }[];
}) {
  const dirUnidades = unidades.filter(u => u.diretoria_id === diretoria.id);

  const uniCoordData = dirUnidades.map(uni => {
    const uniServs = servidores.filter(s => s.unidade_id === uni.id);
    const coordIds = [...new Set(coordenadoresUnidades.filter(cu => cu.unidade_id === uni.id).map(cu => cu.servidor_id))];
    const coords = coordIds.map(id => servidores.find(s => s.id === id)).filter(Boolean) as ServidorDB[];
    const presentes = uniServs.filter(s => s.status_presenca === "presente").length;
    const pct = uniServs.length > 0 ? Math.round((presentes / uniServs.length) * 100) : 0;
    return { uni, coords, total: uniServs.length, presentes, pct };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader
        title={`Coordenadores — ${diretoria.nome}`}
        subtitle={`${dirUnidades.length} unidades`}
        icon={<UserCheck className="h-7 w-7 text-white" />}
      />
      <TVScrollArea className="flex-1 overflow-y-auto space-y-3 pr-2">
        {uniCoordData.map((d, i) => {
          const textColor = d.pct >= 80 ? "text-emerald-400" : d.pct >= 60 ? "text-amber-400" : "text-red-400";
          return (
            <AnimatedCard key={d.uni.id} delay={150 + i * 100}>
              <div className="rounded-xl bg-[#0f1a2e]/80 border border-[#1e3a5f]/40 p-4 hover:border-teal-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20">
                      <MapPin className="h-4 w-4 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{d.uni.sigla} — {d.uni.nome}</p>
                      <p className="text-[10px] text-slate-500">{d.total} servidores · {d.presentes} presentes</p>
                    </div>
                  </div>
                  <span className={`text-xl font-black font-mono ${textColor}`}>{d.pct}%</span>
                </div>
                {d.coords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {d.coords.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-300">
                        <UserCheck className="h-3.5 w-3.5" /> {c.nome}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-600 mt-2 italic">Sem coordenador designado</p>
                )}
              </div>
            </AnimatedCard>
          );
        })}
      </TVScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE: MAPA DE PRESENÇA POR UNIDADE
// ═══════════════════════════════════════════════════
function SlideMapaUnidades({ servidores, unidades, diretorias, coordenadoresUnidades }: { servidores: ServidorDB[]; unidades: UnidadeDB[]; diretorias: DiretoriaDB[]; coordenadoresUnidades: { servidor_id: string; unidade_id: string }[] }) {
  const grouped = useMemo(() => {
    return diretorias.map(dir => {
      const dirUnis = unidades.filter(u => u.diretoria_id === dir.id);
      const dirServs = servidores.filter(s => s.diretoria_id === dir.id);
      const coordIds = new Set(coordenadoresUnidades.filter(cu => dirUnis.some(u => u.id === cu.unidade_id)).map(cu => cu.servidor_id));
      const uniData = dirUnis.map(uni => {
        const us = servidores.filter(s => s.unidade_id === uni.id);
        const presentes = us.filter(s => s.status_presenca === "presente").length;
        const pct = us.length > 0 ? Math.round((presentes / us.length) * 100) : 0;
        return { id: uni.id, sigla: uni.sigla, nome: uni.nome, total: us.length, presentes, pct };
      }).filter(u => u.total > 0).sort((a, b) => b.total - a.total);
      return { dir, uniData, totalServs: dirServs.length, totalUnis: dirUnis.length, totalCoords: coordIds.size };
    }).filter(g => g.totalServs > 0).sort((a, b) => b.totalServs - a.totalServs);
  }, [servidores, unidades, diretorias, coordenadoresUnidades]);

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader title="Mapa de Presença por Diretoria" subtitle={`${grouped.length} diretorias · ${unidades.length} unidades`} icon={<MapPin className="h-7 w-7 text-white" />} />
      <TVScrollArea className="flex-1 overflow-y-auto pr-2 space-y-5">
        {grouped.map((g, gi) => (
          <AnimatedCard key={g.dir.id} delay={100 + gi * 120}>
            <GlowCard color={gi % 2 === 0 ? "teal" : "emerald"}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-teal-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{g.dir.nome}</p>
                      <p className="text-[10px] text-slate-500">{g.totalServs} servidores · {g.totalUnis} unidades · {g.totalCoords} coordenadores</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {g.uniData.slice(0, 8).map(uni => {
                    const barColor = uni.pct >= 80 ? "from-emerald-500 to-green-400" : uni.pct >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400";
                    const textColor = uni.pct >= 80 ? "text-emerald-400" : uni.pct >= 60 ? "text-amber-400" : "text-red-400";
                    return (
                      <div key={uni.id} className="rounded-xl bg-[#0a1628]/80 border border-[#1e3a5f]/30 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-teal-400 uppercase tracking-wider truncate">{uni.sigla}</span>
                          <span className={`text-sm font-black font-mono ${textColor}`}>{uni.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1a2744] overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${uni.pct}%`, transition: "width 1.2s ease-out" }} />
                        </div>
                        <span className="text-[9px] text-slate-600 font-mono mt-1 block">{uni.presentes}/{uni.total}</span>
                      </div>
                    );
                  })}
                  {g.uniData.length > 8 && (
                    <div className="rounded-xl bg-[#0a1628]/50 border border-dashed border-[#1e3a5f]/30 p-3 flex items-center justify-center">
                      <span className="text-[10px] text-slate-600">+{g.uniData.length - 8} unidades</span>
                    </div>
                  )}
                </div>
              </div>
            </GlowCard>
          </AnimatedCard>
        ))}
      </TVScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SLIDE: COMPOSIÇÃO DA DIRETORIA (pie charts)
// ═══════════════════════════════════════════════════
function SlideComposicaoDiretoria({ diretoria, servidores }: { diretoria: DiretoriaDB; servidores: ServidorDB[] }) {
  const dirServs = servidores.filter(s => s.diretoria_id === diretoria.id);
  const stats = computeStats(dirServs);

  const vinculoData = [
    { name: "Concursados", value: dirServs.filter(s => (s.vinculo || "").includes("CONCURSADO")).length },
    { name: "Contratados", value: dirServs.filter(s => (s.vinculo || "").includes("CONTRATO")).length },
    { name: "Estagiários", value: dirServs.filter(s => s.vinculo === "ESTAGIARIO").length },
    { name: "Outros", value: dirServs.length - dirServs.filter(s => (s.vinculo || "").includes("CONCURSADO")).length - dirServs.filter(s => (s.vinculo || "").includes("CONTRATO")).length - dirServs.filter(s => s.vinculo === "ESTAGIARIO").length },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: "Presentes", value: stats.presentes },
    { name: "Férias", value: stats.ferias },
    { name: "Afastados", value: stats.afastados },
    { name: "Ausentes", value: stats.ausentes },
  ].filter(d => d.value > 0);

  const coberturaData = [
    { name: "Integral", value: dirServs.filter(s => s.cobertura_prevista === "INTEGRAL").length },
    { name: "Parcial", value: dirServs.filter(s => s.cobertura_prevista === "PARCIAL").length },
  ].filter(d => d.value > 0);

  const vinculoColors = ["#0d9488", "#3b82f6", "#8b5cf6", "#475569"];
  const statusColors = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const coberturaColors = ["#06b6d4", "#f97316"];

  const renderChart = (data: { name: string; value: number }[], colors: string[], title: string, delay: number) => (
    <AnimatedCard delay={delay}>
      <GlowCard>
        <div className="p-5 flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">{title}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" animationDuration={1200}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: "14px", fontSize: "12px", color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 justify-center mt-3">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full shadow-lg" style={{ background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}40` }} />
                <span className="text-xs text-slate-400">{d.name}</span>
                <span className="text-xs font-black text-white font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </GlowCard>
    </AnimatedCard>
  );

  return (
    <div className="h-full flex flex-col p-8">
      <TVHeader title={`Composição — ${diretoria.nome}`} subtitle="Vínculo, status e cobertura" icon={<Briefcase className="h-7 w-7 text-white" />} />
      <div className="flex-1 grid grid-cols-3 gap-6 mt-4">
        {renderChart(vinculoData, vinculoColors, "Por Vínculo", 200)}
        {renderChart(statusData, statusColors, "Por Status", 400)}
        {renderChart(coberturaData, coberturaColors, "Por Cobertura", 600)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN TV MODE
// ═══════════════════════════════════════════════════
export default function ModoTV() {
  const [searchParams] = useSearchParams();
  const diretoriaParam = searchParams.get("diretoria") || "";

  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("tv_unlocked") === "1");
  const [servidoresRaw, setServidoresRaw] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [coordenadoresUnidades, setCoordenadoresUnidades] = useState<{ servidor_id: string; unidade_id: string }[]>([]);
  const [escalasSemanais, setEscalasSemanais] = useState<EscalaSemanalRow[]>([]);
  const [atestados, setAtestados] = useState<AtestadoDB[]>([]);
  const [afastamentos, setAfastamentos] = useState<AfastamentoDB[]>([]);
  const [faltasAbonadas, setFaltasAbonadas] = useState<Pick<FaltaAbonadaDB, "servidor_id" | "data">[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [transitioning, setTransitioning] = useState(false);

  // Avisos banner state
  interface TVAviso { id: string; titulo: string; mensagem: string; destinatario_tipo: string; destinatario_diretoria_id: string | null; }
  const [avisos, setAvisos] = useState<TVAviso[]>([]);
  const [currentAvisoIndex, setCurrentAvisoIndex] = useState(0);
  const [showAvisoBanner, setShowAvisoBanner] = useState(false);
  const AVISO_DURATION = 120000; // 2 minutes

  const SLIDE_DURATION = 30000;
  const TRANSITION_DURATION = 900;

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
    const [
      { data: dirs },
      { data: unis },
      { data: cuData },
      { data: escalasData },
      { data: atestadosData },
      { data: afastamentosData },
      { data: faltasData },
      { data: avisosData },
    ] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("coordenadores_unidades").select("servidor_id, unidade_id"),
      supabase.from("escalas_semanais").select("servidor_id, dia_semana, entrada1, saida1, entrada2, saida2"),
      supabase.from("atestados").select("*"),
      supabase.from("afastamentos").select("*"),
      supabase.from("faltas_abonadas").select("servidor_id, data"),
      supabase.from("avisos").select("id, titulo, mensagem, destinatario_tipo, destinatario_diretoria_id").eq("ativo", true).order("created_at", { ascending: false }),
    ]);
    setServidoresRaw(allServ as ServidorDB[]);
    setDiretorias((dirs ?? []) as DiretoriaDB[]);
    setUnidades((unis ?? []) as UnidadeDB[]);
    setCoordenadoresUnidades((cuData ?? []) as { servidor_id: string; unidade_id: string }[]);
    setEscalasSemanais((escalasData ?? []) as EscalaSemanalRow[]);
    setAtestados((atestadosData ?? []) as AtestadoDB[]);
    setAfastamentos((afastamentosData ?? []) as AfastamentoDB[]);
    setFaltasAbonadas((faltasData ?? []) as Pick<FaltaAbonadaDB, "servidor_id" | "data">[]);
    
    // Filter avisos relevant to this TV (by diretoria param or "todos")
    const relevantAvisos = ((avisosData ?? []) as TVAviso[]).filter(a => {
      if (a.destinatario_tipo === "todos") return true;
      if (a.destinatario_tipo === "diretoria" && diretoriaParam && a.destinatario_diretoria_id === diretoriaParam) return true;
      return false;
    });
    setAvisos(relevantAvisos);
    
    setLoading(false);
  }, [diretoriaParam]);

  // Tick every 60s to recalculate auto-presence with fresh "now"
  const [presencaTick, setPresencaTick] = useState(0);

  useEffect(() => {
    if (!unlocked) return;
    loadData();
    const dataInterval = setInterval(loadData, 60000);
    const presencaInterval = setInterval(() => setPresencaTick(t => t + 1), 60000);

    // Realtime subscription for instant updates
    const channel = supabase
      .channel("tv-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "servidores" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas_semanais" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "avisos" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      clearInterval(dataInterval);
      clearInterval(presencaInterval);
      supabase.removeChannel(channel);
    };
  }, [unlocked, loadData]);

  // Find specific diretoria if param provided
  const targetDiretoria = diretoriaParam ? diretorias.find(d => d.id === diretoriaParam) : null;

  // Apply auto-presence based on escalas_semanais (recalculates every tick)
  const servidores = useMemo(
    () => applyAutoPresenca(servidoresRaw, escalasSemanais, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [servidoresRaw, escalasSemanais, presencaTick],
  );

  const slides = useMemo(() => {
    if (loading) return [];
    const s: React.ReactNode[] = [];
    if (targetDiretoria) {
      // ── MODO DIRETORIA ESPECÍFICA ──
      const dir = targetDiretoria;
      const dirServs = servidores.filter(sv => sv.diretoria_id === dir.id);

      // Slide 1: Overview da diretoria
      s.push(<SlideDiretoriaDetalhe key="dir-overview" diretoria={dir} servidores={servidores} unidades={unidades} coordenadoresUnidades={coordenadoresUnidades} />);

      // Slide 2: Coordenadores por unidade
      s.push(<SlideDiretoriaCoordenadores key="dir-coords" diretoria={dir} servidores={servidores} unidades={unidades} coordenadoresUnidades={coordenadoresUnidades} />);

      // Slide 3: Servidores presentes
      if (dirServs.filter(sv => sv.status_presenca === "presente").length > 0) {
        s.push(<SlideDiretoriaServidores key="dir-presentes" diretoria={dir} servidores={servidores} status="presente" statusLabel="Presentes" statusIcon={<CheckCircle className="h-7 w-7 text-white" />} statusColor="bg-emerald-500/20 text-emerald-400" />);
      }

      // Slide 4: Servidores em férias
      if (dirServs.filter(sv => sv.status_presenca === "ferias").length > 0) {
        s.push(<SlideDiretoriaServidores key="dir-ferias" diretoria={dir} servidores={servidores} status="ferias" statusLabel="Férias" statusIcon={<Palmtree className="h-7 w-7 text-white" />} statusColor="bg-amber-500/20 text-amber-400" />);
      }

      // Slide 5: Servidores afastados
      if (dirServs.filter(sv => sv.status_presenca === "afastado").length > 0) {
        s.push(<SlideDiretoriaServidores key="dir-afastados" diretoria={dir} servidores={servidores} status="afastado" statusLabel="Afastados" statusIcon={<AlertTriangle className="h-7 w-7 text-white" />} statusColor="bg-red-500/20 text-red-400" />);
      }

      // Slide 6: Alertas
      s.push(<SlideDiretoriaAlertas key="dir-alertas" diretoria={dir} servidores={servidores} />);

      // Slide 7: Composição
      s.push(<SlideComposicaoDiretoria key="dir-composicao" diretoria={dir} servidores={servidores} />);

    } else {
      // ── MODO GERAL (original) ──
      s.push(<SlideOverview key="overview" servidores={servidores} diretorias={diretorias} unidades={unidades} />);
      // SlideRankingDiretorias removido — info redundante com overview e slides por diretoria
      s.push(<SlideComposicao key="composicao" servidores={servidores} diretorias={diretorias} />);
      const dirsComServs = diretorias.filter(d => servidores.some(sv => sv.diretoria_id === d.id));
      dirsComServs.forEach(dir => {
        s.push(<SlideDiretoriaDetalhe key={`dir-${dir.id}`} diretoria={dir} servidores={servidores} unidades={unidades} coordenadoresUnidades={coordenadoresUnidades} />);
        s.push(<SlideDiretoriaCoordenadores key={`dir-coords-${dir.id}`} diretoria={dir} servidores={servidores} unidades={unidades} coordenadoresUnidades={coordenadoresUnidades} />);
        s.push(<SlideDiretoriaAlertas key={`dir-alertas-${dir.id}`} diretoria={dir} servidores={servidores} />);
      });
      s.push(<SlideMapaUnidades key="mapa" servidores={servidores} unidades={unidades} diretorias={diretorias} coordenadoresUnidades={coordenadoresUnidades} />);
    }
    return s;
  }, [servidores, diretorias, unidades, loading, targetDiretoria, coordenadoresUnidades]);

  const TOTAL_SLIDES = slides.length;

  const goToSlide = useCallback((index: number, direction: "left" | "right" = "left") => {
    setSlideDirection(direction);
    setTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setTransitioning(false);
    }, TRANSITION_DURATION / 2);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!unlocked || loading || TOTAL_SLIDES === 0) return;
    const interval = setInterval(() => {
      goToSlide((currentSlide + 1) % TOTAL_SLIDES, "left");
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [unlocked, loading, TOTAL_SLIDES, currentSlide, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        goToSlide((currentSlide + 1) % TOTAL_SLIDES, "left");
      } else if (e.key === "ArrowLeft") {
        goToSlide((currentSlide - 1 + TOTAL_SLIDES) % TOTAL_SLIDES, "right");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentSlide, TOTAL_SLIDES, goToSlide]);

  // Aviso banner: show each aviso for 2 minutes, cycling through them
  useEffect(() => {
    if (avisos.length === 0) {
      setShowAvisoBanner(false);
      return;
    }
    setShowAvisoBanner(true);
    setCurrentAvisoIndex(0);
  }, [avisos.length]);

  useEffect(() => {
    if (!showAvisoBanner || avisos.length === 0) return;
    const timer = setInterval(() => {
      setCurrentAvisoIndex(prev => {
        const next = prev + 1;
        if (next >= avisos.length) {
          // All avisos shown, hide banner
          setShowAvisoBanner(false);
          return 0;
        }
        return next;
      });
    }, AVISO_DURATION);
    return () => clearInterval(timer);
  }, [showAvisoBanner, avisos.length, AVISO_DURATION]);

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060e1a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className="relative flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-teal-500/30">
            <Monitor className="h-10 w-10 text-white animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Carregando Painel</p>
            <p className="text-slate-500 text-sm mt-1">Preparando dados em tempo real...</p>
          </div>
          <div className="w-48 h-1 rounded-full bg-[#1a2744] overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const getTransitionStyle = () => {
    if (!transitioning) return { opacity: 1, transform: "translateX(0) scale(1)", filter: "blur(0px)" };
    const dir = slideDirection === "left" ? 30 : -30;
    return { opacity: 0, transform: `translateX(${dir}px) scale(0.97)`, filter: "blur(4px)" };
  };

  return (
    <div className="h-screen w-screen bg-[#060e1a] overflow-hidden relative select-none cursor-none">
      {/* Background ambient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/[0.02] rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30,58,95,0.15) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      {/* Slide content */}
      <div
        className="h-full w-full relative z-10"
        style={{
          ...getTransitionStyle(),
          transition: `opacity ${TRANSITION_DURATION / 2}ms ease-in-out, transform ${TRANSITION_DURATION / 2}ms ease-in-out, filter ${TRANSITION_DURATION / 2}ms ease-in-out`,
        }}
      >
        {slides[currentSlide]}
      </div>

      {/* Aviso Banner */}
      {showAvisoBanner && avisos[currentAvisoIndex] && (
        <div className="absolute top-0 left-0 right-0 z-30 animate-in slide-in-from-top duration-700">
          <div className="mx-8 mt-6 rounded-2xl bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-red-500/90 border border-amber-400/30 shadow-2xl shadow-amber-500/20 backdrop-blur-xl overflow-hidden">
            <div className="px-8 py-5 flex items-start gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 flex-shrink-0 mt-0.5">
                <Megaphone className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">AVISO IMPORTANTE</span>
                  {avisos.length > 1 && (
                    <span className="text-[10px] font-bold text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                      {currentAvisoIndex + 1}/{avisos.length}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">{avisos[currentAvisoIndex].titulo}</h2>
                <p className="text-sm text-white/80 leading-relaxed line-clamp-3">{avisos[currentAvisoIndex].mensagem}</p>
              </div>
            </div>
            {/* Progress bar for 2 min duration */}
            <div className="h-1 bg-white/10">
              <div
                className="h-full bg-white/40 rounded-full"
                style={{
                  animation: `aviso-progress ${AVISO_DURATION}ms linear forwards`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress bar, slide indicators and counter removed */}

      {/* Logo watermark */}
      <div className="absolute bottom-5 left-8 flex items-center gap-2 z-20 opacity-40">
        <Zap className="h-3.5 w-3.5 text-teal-500" />
        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">SMSTL Monitor</span>
      </div>
    </div>
  );
}
