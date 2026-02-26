import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServidorDB, DiretoriaDB, UnidadeDB, FuncaoDB, AtestadoDB, FaltaAbonadaDB } from "@/hooks/useServidores";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Users, Clock, AlertTriangle, Palmtree, FileText,
  CheckCircle, Building2, ChevronDown, ChevronRight, Plus, X, Calendar,
  DollarSign, Eye, Shield, Ban, Pencil, Save, CalendarCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { EscalaSemanalEditor } from "@/components/EscalaSemanalEditor";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MonitorContent() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get("view") || "tudo"; // tudo | diretoria | unidade
  const selectedDiretoriaId = searchParams.get("diretoria") || "";
  const selectedUnidadeId = searchParams.get("unidade") || "";

  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoDB[]>([]);
  const [atestados, setAtestados] = useState<AtestadoDB[]>([]);
  const [faltasAbonadas, setFaltasAbonadas] = useState<FaltaAbonadaDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Atestado form
  const [showAtestadoForm, setShowAtestadoForm] = useState(false);
  const [atestadoForm, setAtestadoForm] = useState({ servidor_id: "", tipo: "médico", data_inicio: "", data_fim: "", dias: 1, observacao: "" });
  const [atestadoSearch, setAtestadoSearch] = useState("");

  // Falta abonada form
  const [showFaltaForm, setShowFaltaForm] = useState(false);
  const [faltaForm, setFaltaForm] = useState({ servidor_id: "", data: "", observacao: "" });
  const [faltaSearch, setFaltaSearch] = useState("");

  // Bulk edit escalas
  const [showBulkEscala, setShowBulkEscala] = useState(false);
  const [bulkEscalas, setBulkEscalas] = useState<Record<string, { inicio1: string; fim1: string; inicio2: string; fim2: string; total: string }>>({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [expandedSemanalId, setExpandedSemanalId] = useState<string | null>(null);

  // Expanded diretorias
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

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
    const [d, u, f, a, fa] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("funcoes").select("*").order("nome"),
      supabase.from("atestados").select("*").order("data_inicio", { ascending: false }),
      supabase.from("faltas_abonadas").select("*").order("data", { ascending: false }),
    ]);
    setServidores(allSrv as ServidorDB[]);
    setDiretorias((d.data ?? []) as DiretoriaDB[]);
    setUnidades((u.data ?? []) as UnidadeDB[]);
    setFuncoes((f.data ?? []) as FuncaoDB[]);
    setAtestados((a.data ?? []) as AtestadoDB[]);
    setFaltasAbonadas((fa.data ?? []) as FaltaAbonadaDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date();

  // Filter servidores based on view
  const filteredServidores = useMemo(() => {
    if (selectedUnidadeId) return servidores.filter(s => s.unidade_id === selectedUnidadeId);
    if (selectedDiretoriaId) return servidores.filter(s => s.diretoria_id === selectedDiretoriaId);
    return servidores;
  }, [servidores, selectedUnidadeId, selectedDiretoriaId]);

  // Time helpers
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  const parseTime = (t: string | null): number | null => {
    if (!t) return null;
    const parts = t.split(":");
    if (parts.length < 2) return null;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };
  const isOnShift = (s: ServidorDB) => {
    const start1 = parseTime(s.escala_inicio1);
    const end1 = parseTime(s.escala_fim1);
    const start2 = parseTime(s.escala_inicio2);
    const end2 = parseTime(s.escala_fim2);
    if (start1 !== null && end1 !== null && currentTimeMinutes >= start1 && currentTimeMinutes <= end1) return true;
    if (start2 !== null && end2 !== null && currentTimeMinutes >= start2 && currentTimeMinutes <= end2) return true;
    return false;
  };

  const onShift = filteredServidores.filter(s => s.status_presenca === "presente" && isOnShift(s));
  const offShift = filteredServidores.filter(s => s.status_presenca === "presente" && !isOnShift(s));

  const upcomingVacations = useMemo(() => {
    const limit = addDays(today, 30);
    return filteredServidores.filter(s => {
      if (!s.ferias_periodo1_inicio) return false;
      try { const start = parseISO(s.ferias_periodo1_inicio); return isAfter(start, today) && isBefore(start, limit); } catch { return false; }
    }).sort((a, b) => (a.ferias_periodo1_inicio || "").localeCompare(b.ferias_periodo1_inicio || ""));
  }, [filteredServidores]);

  const activeAtestados = useMemo(() => {
    const srvIds = new Set(filteredServidores.map(s => s.id));
    return atestados.filter(a => {
      if (!srvIds.has(a.servidor_id)) return false;
      try { return isWithinInterval(today, { start: parseISO(a.data_inicio), end: parseISO(a.data_fim) }); } catch { return false; }
    });
  }, [atestados, filteredServidores]);

  const endingSoonAtestados = useMemo(() => {
    const limit = addDays(today, 7);
    const srvIds = new Set(filteredServidores.map(s => s.id));
    return atestados.filter(a => {
      if (!srvIds.has(a.servidor_id)) return false;
      try { const end = parseISO(a.data_fim); return isAfter(end, today) && isBefore(end, limit); } catch { return false; }
    });
  }, [atestados, filteredServidores]);

  const getServidorNome = (id: string) => servidores.find(s => s.id === id)?.nome || "—";

  // Stats
  const presentes = filteredServidores.filter(s => s.status_presenca === "presente").length;
  const emFerias = filteredServidores.filter(s => s.status_presenca === "ferias").length;
  const afastados = filteredServidores.filter(s => s.status_presenca === "afastado").length;
  const totalHoras = filteredServidores.reduce((sum, s) => sum + (s.escala_total_horas || 0), 0);
  const totalFolha = filteredServidores.reduce((sum, s) => sum + (s.salario || 0), 0);

  const addAtestado = async () => {
    if (!atestadoForm.servidor_id || !atestadoForm.data_inicio || !atestadoForm.data_fim) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("atestados").insert({
      servidor_id: atestadoForm.servidor_id, tipo: atestadoForm.tipo,
      data_inicio: atestadoForm.data_inicio, data_fim: atestadoForm.data_fim,
      dias: atestadoForm.dias, observacao: atestadoForm.observacao || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Atestado registrado!" });
    setShowAtestadoForm(false);
    setAtestadoForm({ servidor_id: "", tipo: "médico", data_inicio: "", data_fim: "", dias: 1, observacao: "" });
    loadData();
  };

  // Faltas abonadas helpers
  const getFaltasNoAno = (servidorId: string, dataAdmissao: string | null) => {
    if (!dataAdmissao) return { usadas: 0, limite: 5, anoInicio: "", anoFim: "" };
    const admDate = parseISO(dataAdmissao);
    const now = new Date();
    // Calculate current anniversary year
    let anoInicio = new Date(now.getFullYear(), admDate.getMonth(), admDate.getDate());
    if (isAfter(anoInicio, now)) {
      anoInicio = new Date(now.getFullYear() - 1, admDate.getMonth(), admDate.getDate());
    }
    const anoFim = new Date(anoInicio.getFullYear() + 1, anoInicio.getMonth(), anoInicio.getDate());
    const usadas = faltasAbonadas.filter(f => {
      if (f.servidor_id !== servidorId) return false;
      const d = parseISO(f.data);
      return !isBefore(d, anoInicio) && isBefore(d, anoFim);
    }).length;
    return { usadas, limite: 5, anoInicio: format(anoInicio, "dd/MM/yyyy"), anoFim: format(anoFim, "dd/MM/yyyy") };
  };

  const addFaltaAbonada = async () => {
    if (!faltaForm.servidor_id || !faltaForm.data) {
      toast({ title: "Preencha servidor e data", variant: "destructive" }); return;
    }
    const srv = servidores.find(s => s.id === faltaForm.servidor_id);
    const info = getFaltasNoAno(faltaForm.servidor_id, srv?.data_admissao || null);
    if (info.usadas >= 5) {
      toast({ title: "Limite atingido", description: `Este servidor já usou ${info.usadas}/5 faltas abonadas neste período.`, variant: "destructive" }); return;
    }
    const { error } = await supabase.from("faltas_abonadas").insert({
      servidor_id: faltaForm.servidor_id, data: faltaForm.data, observacao: faltaForm.observacao || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Falta abonada registrada!" });
    setShowFaltaForm(false);
    setFaltaForm({ servidor_id: "", data: "", observacao: "" });
    loadData();
  };

  const filteredFaltaServidores = faltaSearch.length >= 2
    ? filteredServidores.filter(s => s.nome.toLowerCase().includes(faltaSearch.toLowerCase())).slice(0, 10)
    : filteredServidores.slice(0, 10);

  const filteredAtestadoServidores = atestadoSearch.length >= 2
    ? filteredServidores.filter(s => s.nome.toLowerCase().includes(atestadoSearch.toLowerCase())).slice(0, 10)
    : filteredServidores.slice(0, 10);

  // Bulk escala save
  const initBulkEscalas = () => {
    const initial: Record<string, any> = {};
    filteredServidores.forEach(s => {
      initial[s.id] = { inicio1: s.escala_inicio1 || "", fim1: s.escala_fim1 || "", inicio2: s.escala_inicio2 || "", fim2: s.escala_fim2 || "", total: s.escala_total_horas?.toString() || "" };
    });
    setBulkEscalas(initial);
    setShowBulkEscala(true);
  };

  const saveBulkEscalas = async () => {
    setSavingBulk(true);
    let count = 0;
    for (const [id, esc] of Object.entries(bulkEscalas)) {
      const { error } = await supabase.from("servidores").update({
        escala_inicio1: esc.inicio1 || null, escala_fim1: esc.fim1 || null,
        escala_inicio2: esc.inicio2 || null, escala_fim2: esc.fim2 || null,
        escala_total_horas: esc.total ? parseInt(esc.total) : null,
      }).eq("id", id);
      if (!error) count++;
    }
    setSavingBulk(false);
    toast({ title: `${count} escalas atualizadas!` });
    setShowBulkEscala(false);
    loadData();
  };

  // Contract expiry alerts (temporary contracts)
  const contractAlerts = useMemo(() => {
    return filteredServidores.filter(s => {
      if (!s.vinculo?.includes("CONTRATO") && !s.vinculo?.includes("TEMPORARIO")) return false;
      return !!s.data_admissao;
    }).map(s => {
      const admDate = parseISO(s.data_admissao!);
      const daysFromAdmission = differenceInDays(new Date(), admDate);
      return { ...s, daysFromAdmission };
    }).sort((a, b) => b.daysFromAdmission - a.daysFromAdmission);
  }, [filteredServidores]);

  // Navigation
  const setView = (mode: string, dirId?: string, uniId?: string) => {
    const params: Record<string, string> = { view: mode };
    if (dirId) params.diretoria = dirId;
    if (uniId) params.unidade = uniId;
    setSearchParams(params);
  };

  // Payroll card for a group of servidores
  const PayrollCard = ({ servs, label }: { servs: ServidorDB[]; label: string }) => {
    const folha = servs.reduce((sum, s) => sum + (s.salario || 0), 0);
    const count = servs.length;
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <DollarSign className="h-3.5 w-3.5 text-primary" /> {label}
        </div>
        <p className="text-xl font-bold text-foreground font-mono">{formatCurrency(folha)}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span>{count} servidores</span>
        </div>
      </div>
    );
  };

  // Unit summary card (used in hierarchy view)
  const UnitSummaryCard = ({ uni }: { uni: UnidadeDB }) => {
    const uniServs = servidores.filter(s => s.unidade_id === uni.id);
    const uniPresentes = uniServs.filter(s => s.status_presenca === "presente").length;
    const uniFolha = uniServs.reduce((sum, s) => sum + (s.salario || 0), 0);
    const pct = uniServs.length > 0 ? Math.round((uniPresentes / uniServs.length) * 100) : 0;
    const pctColor = pct >= 80 ? "text-success bg-success/10" : pct >= 50 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";

    return (
      <button
        onClick={() => setView("unidade", uni.diretoria_id, uni.id)}
        className="w-full rounded-lg border border-border/60 bg-card/80 p-4 text-left hover:shadow-md transition-all hover:border-primary/30 group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary mr-1.5">{uni.sigla}</span>
            <span className="text-xs text-muted-foreground">{uni.nome}</span>
          </div>
          <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono", pctColor)}>{pct}%</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {uniServs.length}</span>
          <span className="flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" /> {uniPresentes}</span>
          {uniFolha > 0 && <span className="flex items-center gap-1 text-primary"><DollarSign className="h-3 w-3" /> {formatCurrency(uniFolha)}</span>}
        </div>
      </button>
    );
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Current breadcrumb
  const currentDiretoria = diretorias.find(d => d.id === selectedDiretoriaId);
  const currentUnidade = unidades.find(u => u.id === selectedUnidadeId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Monitor de Unidade</h1>
              <p className="text-xs text-muted-foreground">Escalas, atestados, férias e folha em tempo real</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setView("tudo")}
            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
              viewMode === "tudo" && !selectedDiretoriaId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground")}
          >
            <Eye className="h-3.5 w-3.5" /> Visão Geral
          </button>

          {currentDiretoria && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => setView("diretoria", currentDiretoria.id)}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                  selectedDiretoriaId && !selectedUnidadeId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground")}
              >
                <Building2 className="h-3.5 w-3.5" /> {currentDiretoria.nome}
              </button>
            </>
          )}

          {currentUnidade && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground">
                {currentUnidade.sigla} — {currentUnidade.nome}
              </span>
            </>
          )}
        </div>

        {/* ═══ VISÃO GERAL ═══ */}
        {viewMode === "tudo" && !selectedDiretoriaId && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /> Total</div>
                <p className="text-2xl font-bold text-foreground">{servidores.length.toLocaleString("pt-BR")}</p>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-xs text-success mb-1"><CheckCircle className="h-3.5 w-3.5" /> Presentes</div>
                <p className="text-2xl font-bold text-success">{servidores.filter(s => s.status_presenca === "presente").length}</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 text-xs text-warning mb-1"><Palmtree className="h-3.5 w-3.5" /> Férias</div>
                <p className="text-2xl font-bold text-warning">{servidores.filter(s => s.status_presenca === "ferias").length}</p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-xs text-destructive mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Afastados</div>
                <p className="text-2xl font-bold text-destructive">{servidores.filter(s => s.status_presenca === "afastado").length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga Total</div>
                <p className="text-2xl font-bold text-foreground">{servidores.reduce((s, sv) => s + (sv.escala_total_horas || 0), 0)}h</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs text-primary mb-1"><DollarSign className="h-3.5 w-3.5" /> Folha Total</div>
                <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(servidores.reduce((s, sv) => s + (sv.salario || 0), 0))}</p>
              </div>
            </div>

            {/* Diretorias grid */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Diretorias</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {diretorias.map(dir => {
                  const dirServs = servidores.filter(s => s.diretoria_id === dir.id);
                  const dirPresentes = dirServs.filter(s => s.status_presenca === "presente").length;
                  const dirFolha = dirServs.reduce((sum, s) => sum + (s.salario || 0), 0);
                  const dirUnidades = unidades.filter(u => u.diretoria_id === dir.id);
                  const diretor = servidores.find(s => s.diretoria_id === dir.id && s.is_diretor);

                  return (
                    <button
                      key={dir.id}
                      onClick={() => setView("diretoria", dir.id)}
                      className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md transition-all hover:border-primary/30 group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{dir.nome}</h3>
                      </div>
                      {diretor && (
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Diretor(a): <span className="font-medium text-foreground">{diretor.nome}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span><Users className="h-3 w-3 inline mr-1" />{dirServs.length}</span>
                        <span className="text-success"><CheckCircle className="h-3 w-3 inline mr-1" />{dirPresentes}</span>
                        <span>{dirUnidades.length} unid.</span>
                      </div>
                      {dirFolha > 0 && (
                        <p className="mt-2 text-xs font-mono font-bold text-primary">{formatCurrency(dirFolha)}</p>
                      )}
                    </button>
                  );
                })}

                {/* Sem diretoria */}
                {(() => {
                  const semDir = servidores.filter(s => !s.diretoria_id);
                  if (semDir.length === 0) return null;
                  const folha = semDir.reduce((s, sv) => s + (sv.salario || 0), 0);
                  return (
                    <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="h-5 w-5 text-warning" />
                        <h3 className="text-sm font-bold text-foreground">Sem Diretoria (Gabinete)</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span><Users className="h-3 w-3 inline mr-1" />{semDir.length}</span>
                        <span className="text-success"><CheckCircle className="h-3 w-3 inline mr-1" />{semDir.filter(s => s.status_presenca === "presente").length}</span>
                      </div>
                      {folha > 0 && <p className="mt-2 text-xs font-mono font-bold text-warning">{formatCurrency(folha)}</p>}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ═══ DIRETORIA VIEW ═══ */}
        {selectedDiretoriaId && !selectedUnidadeId && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /> Total</div>
                <p className="text-2xl font-bold text-foreground">{filteredServidores.length}</p>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-xs text-success mb-1"><CheckCircle className="h-3.5 w-3.5" /> Presentes</div>
                <p className="text-2xl font-bold text-success">{presentes}</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 text-xs text-warning mb-1"><Palmtree className="h-3.5 w-3.5" /> Férias</div>
                <p className="text-2xl font-bold text-warning">{emFerias}</p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-xs text-destructive mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Afastados</div>
                <p className="text-2xl font-bold text-destructive">{afastados}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga</div>
                <p className="text-2xl font-bold text-foreground">{totalHoras}h</p>
              </div>
              <PayrollCard servs={filteredServidores} label="Folha Diretoria" />
            </div>

            {/* Units in this diretoria */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Unidades de {currentDiretoria?.nome}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unidades.filter(u => u.diretoria_id === selectedDiretoriaId).map(uni => (
                  <UnitSummaryCard key={uni.id} uni={uni} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ UNIDADE VIEW (detail) ═══ */}
        {selectedUnidadeId && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /> Total</div>
                <p className="text-2xl font-bold text-foreground">{filteredServidores.length}</p>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-xs text-success mb-1"><CheckCircle className="h-3.5 w-3.5" /> Presentes</div>
                <p className="text-2xl font-bold text-success">{presentes}</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 text-xs text-warning mb-1"><Palmtree className="h-3.5 w-3.5" /> Férias</div>
                <p className="text-2xl font-bold text-warning">{emFerias}</p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-xs text-destructive mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Afastados</div>
                <p className="text-2xl font-bold text-destructive">{afastados}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga</div>
                <p className="text-2xl font-bold text-foreground">{totalHoras}h</p>
              </div>
              <PayrollCard servs={filteredServidores} label="Folha Unidade" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* On shift */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-success flex items-center gap-2 mb-3">
                  <Clock className="h-3.5 w-3.5" /> Em serviço agora ({onShift.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {onShift.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum servidor em horário de serviço agora.</p>}
                  {onShift.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-success/5 border border-success/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{s.cargo}</p>
                      </div>
                      <span className="text-xs font-mono text-success">
                        {s.escala_inicio1}-{s.escala_fim1}
                        {s.escala_inicio2 && ` / ${s.escala_inicio2}-${s.escala_fim2}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Off shift */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                  <Clock className="h-3.5 w-3.5" /> Fora do horário ({offShift.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {offShift.length === 0 && <p className="text-xs text-muted-foreground italic">Todos os presentes estão em horário.</p>}
                  {offShift.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{s.cargo}</p>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {s.escala_inicio1 ? `${s.escala_inicio1}-${s.escala_fim1}` : "Sem escala"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vacations */}
              <div className="rounded-xl border border-warning/30 bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-warning flex items-center gap-2 mb-3">
                  <Palmtree className="h-3.5 w-3.5" /> Férias próximas (30 dias) — {upcomingVacations.length}
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {upcomingVacations.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma férias nos próximos 30 dias.</p>}
                  {upcomingVacations.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-warning/5 border border-warning/10">
                      <div><p className="text-sm font-medium text-foreground">{s.nome}</p><p className="text-[10px] text-muted-foreground">{s.cargo}</p></div>
                      <span className="text-xs font-mono text-warning">{s.ferias_periodo1_inicio} → {s.ferias_periodo1_fim}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atestados */}
              <div className="rounded-xl border border-destructive/30 bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> Atestados ativos ({activeAtestados.length})
                  </h3>
                  <button onClick={() => setShowAtestadoForm(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                    <Plus className="h-3.5 w-3.5" /> Registrar
                  </button>
                </div>
                {showAtestadoForm && (
                  <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="space-y-1">
                      <input value={atestadoSearch} onChange={e => setAtestadoSearch(e.target.value)} placeholder="Buscar servidor..."
                        className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                      {!atestadoForm.servidor_id && (
                        <div className="max-h-28 overflow-y-auto bg-card rounded border border-border shadow-md">
                          {filteredAtestadoServidores.map(s => (
                            <button key={s.id} onClick={() => { setAtestadoForm(f => ({ ...f, servidor_id: s.id })); setAtestadoSearch(s.nome); }}
                              className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">{s.nome} <span className="text-muted-foreground">({s.cargo})</span></button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-muted-foreground">Início</label>
                        <input type="date" value={atestadoForm.data_inicio} onChange={e => setAtestadoForm(f => ({ ...f, data_inicio: e.target.value }))}
                          className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                      <div><label className="text-[10px] text-muted-foreground">Fim</label>
                        <input type="date" value={atestadoForm.data_fim} onChange={e => setAtestadoForm(f => ({ ...f, data_fim: e.target.value }))}
                          className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-muted-foreground">Tipo</label>
                        <select value={atestadoForm.tipo} onChange={e => setAtestadoForm(f => ({ ...f, tipo: e.target.value }))}
                          className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none">
                          <option value="médico">Médico</option><option value="odontológico">Odontológico</option>
                          <option value="acompanhante">Acompanhante</option><option value="outro">Outro</option>
                        </select></div>
                      <div><label className="text-[10px] text-muted-foreground">Dias</label>
                        <input type="number" min={1} value={atestadoForm.dias} onChange={e => setAtestadoForm(f => ({ ...f, dias: parseInt(e.target.value) || 1 }))}
                          className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                    </div>
                    <input value={atestadoForm.observacao} onChange={e => setAtestadoForm(f => ({ ...f, observacao: e.target.value }))}
                      placeholder="Observação (opcional)" className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                    <div className="flex gap-2">
                      <button onClick={addAtestado} className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Salvar</button>
                      <button onClick={() => { setShowAtestadoForm(false); setAtestadoSearch(""); setAtestadoForm({ servidor_id: "", tipo: "médico", data_inicio: "", data_fim: "", dias: 1, observacao: "" }); }}
                        className="text-xs text-muted-foreground">Cancelar</button>
                    </div>
                  </div>
                )}
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {activeAtestados.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum atestado ativo.</p>}
                  {activeAtestados.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-destructive/5 border border-destructive/10">
                      <div><p className="text-sm font-medium text-foreground">{getServidorNome(a.servidor_id)}</p><p className="text-[10px] text-muted-foreground">{a.tipo} · {a.dias} dia(s)</p></div>
                      <span className="text-xs font-mono text-destructive">{a.data_inicio} → {a.data_fim}</span>
                    </div>
                  ))}
                </div>
                {endingSoonAtestados.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-2">Encerrando em 7 dias ({endingSoonAtestados.length})</h4>
                    {endingSoonAtestados.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-foreground">{getServidorNome(a.servidor_id)}</span>
                        <span className="text-warning font-mono">até {a.data_fim}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Faltas Abonadas */}
            <div className="rounded-xl border border-primary/30 bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5" /> Faltas Abonadas
                </h3>
                <button onClick={() => setShowFaltaForm(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                  <Plus className="h-3.5 w-3.5" /> Registrar
                </button>
              </div>
              {showFaltaForm && (
                <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="space-y-1">
                    <input value={faltaSearch} onChange={e => setFaltaSearch(e.target.value)} placeholder="Buscar servidor..."
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                    {!faltaForm.servidor_id && (
                      <div className="max-h-28 overflow-y-auto bg-card rounded border border-border shadow-md">
                        {filteredFaltaServidores.map(s => (
                          <button key={s.id} onClick={() => { setFaltaForm(f => ({ ...f, servidor_id: s.id })); setFaltaSearch(s.nome); }}
                            className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">{s.nome} <span className="text-muted-foreground">({s.cargo})</span></button>
                        ))}
                      </div>
                    )}
                    {faltaForm.servidor_id && (() => {
                      const srv = servidores.find(s => s.id === faltaForm.servidor_id);
                      const info = getFaltasNoAno(faltaForm.servidor_id, srv?.data_admissao || null);
                      return (
                        <p className="text-[10px] text-muted-foreground">
                          Período: {info.anoInicio} a {info.anoFim} — <span className={info.usadas >= 5 ? "text-destructive font-bold" : "text-primary font-bold"}>{info.usadas}/5 usadas</span>
                          {!srv?.data_admissao && <span className="text-warning ml-1">(sem data de admissão)</span>}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-muted-foreground">Data</label>
                      <input type="date" value={faltaForm.data} onChange={e => setFaltaForm(f => ({ ...f, data: e.target.value }))}
                        className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                    <div><label className="text-[10px] text-muted-foreground">Observação</label>
                      <input value={faltaForm.observacao} onChange={e => setFaltaForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional"
                        className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addFaltaAbonada} className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Salvar</button>
                    <button onClick={() => { setShowFaltaForm(false); setFaltaSearch(""); setFaltaForm({ servidor_id: "", data: "", observacao: "" }); }}
                      className="text-xs text-muted-foreground">Cancelar</button>
                  </div>
                </div>
              )}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredServidores.map(s => {
                  const info = getFaltasNoAno(s.id, s.data_admissao);
                  if (info.usadas === 0 && !s.data_admissao) return null;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-muted/20">
                      <span className="text-xs text-foreground">{s.nome}</span>
                      <span className={cn("text-xs font-mono font-bold", info.usadas >= 5 ? "text-destructive" : info.usadas >= 3 ? "text-warning" : "text-primary")}>{info.usadas}/5</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contract Alerts */}
            {contractAlerts.length > 0 && (
              <div className="rounded-xl border border-warning/30 bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-warning flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5" /> Contratos Temporários — Monitoramento
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {contractAlerts.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-warning/5 border border-warning/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{s.vinculo}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-warning">{s.daysFromAdmission} dias</span>
                        <p className="text-[10px] text-muted-foreground">Admissão: {s.data_admissao ? format(parseISO(s.data_admissao), "dd/MM/yyyy") : "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Funções breakdown */}
            {(() => {
              const unidadeFuncoes = funcoes.filter(f => f.unidade_id === selectedUnidadeId);
              if (unidadeFuncoes.length === 0) return null;
              return (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                    <Building2 className="h-3.5 w-3.5" /> Funções da Unidade
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unidadeFuncoes.map(f => {
                      const fServs = filteredServidores.filter(s => (s as any).funcao_id === f.id);
                      const fPresentes = fServs.filter(s => s.status_presenca === "presente").length;
                      const fFolha = fServs.reduce((sum, s) => sum + ((s as any).salario || 0), 0);
                      return (
                        <div key={f.id} className="rounded-lg border border-border/50 p-3">
                          <h4 className="text-sm font-bold text-foreground mb-2">{f.nome}</h4>
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            <span className="text-muted-foreground">{fServs.length} total</span>
                            <span className="text-success font-medium">{fPresentes} presentes</span>
                            {fFolha > 0 && <span className="text-primary font-mono font-medium">{formatCurrency(fFolha)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Carga horária individual + Bulk edit */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Carga Horária Individual
                </h3>
                {!showBulkEscala ? (
                  <button onClick={initBulkEscalas} className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                    <Pencil className="h-3.5 w-3.5" /> Editar Escalas em Massa
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveBulkEscalas} disabled={savingBulk} className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      {savingBulk ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar Todos
                    </button>
                    <button onClick={() => setShowBulkEscala(false)} className="text-xs text-muted-foreground">Cancelar</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-muted-foreground">Servidor</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Cargo</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Admissão</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Turno 1</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Turno 2</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Total</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Salário</th>
                      <th className="pb-2 font-semibold text-muted-foreground">F.Abon.</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServidores.map(s => {
                      const faltaInfo = getFaltasNoAno(s.id, s.data_admissao);
                      return (
                        <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 font-medium text-foreground">{s.nome}</td>
                          <td className="py-2 text-muted-foreground">{s.cargo}</td>
                          <td className="py-2 text-muted-foreground font-mono">{s.data_admissao ? format(parseISO(s.data_admissao), "dd/MM/yyyy") : "—"}</td>
                          {showBulkEscala && bulkEscalas[s.id] ? (
                            <>
                              <td className="py-1">
                                <div className="flex gap-1">
                                  <input type="time" value={bulkEscalas[s.id].inicio1} onChange={e => setBulkEscalas(prev => ({ ...prev, [s.id]: { ...prev[s.id], inicio1: e.target.value } }))}
                                    className="w-20 h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                                  <input type="time" value={bulkEscalas[s.id].fim1} onChange={e => setBulkEscalas(prev => ({ ...prev, [s.id]: { ...prev[s.id], fim1: e.target.value } }))}
                                    className="w-20 h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                                </div>
                              </td>
                              <td className="py-1">
                                <div className="flex gap-1">
                                  <input type="time" value={bulkEscalas[s.id].inicio2} onChange={e => setBulkEscalas(prev => ({ ...prev, [s.id]: { ...prev[s.id], inicio2: e.target.value } }))}
                                    className="w-20 h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                                  <input type="time" value={bulkEscalas[s.id].fim2} onChange={e => setBulkEscalas(prev => ({ ...prev, [s.id]: { ...prev[s.id], fim2: e.target.value } }))}
                                    className="w-20 h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                                </div>
                              </td>
                              <td className="py-1">
                                <input type="number" value={bulkEscalas[s.id].total} onChange={e => setBulkEscalas(prev => ({ ...prev, [s.id]: { ...prev[s.id], total: e.target.value } }))}
                                  className="w-12 h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground text-center focus:ring-1 focus:ring-ring focus:outline-none" placeholder="h" />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 font-mono text-muted-foreground">{s.escala_inicio1 ? `${s.escala_inicio1}-${s.escala_fim1}` : "—"}</td>
                              <td className="py-2 font-mono text-muted-foreground">{s.escala_inicio2 ? `${s.escala_inicio2}-${s.escala_fim2}` : "—"}</td>
                              <td className="py-2 font-mono font-bold text-foreground">{s.escala_total_horas ? `${s.escala_total_horas}h` : "—"}</td>
                            </>
                          )}
                          <td className="py-2 font-mono text-primary">{s.salario > 0 ? formatCurrency(s.salario) : "—"}</td>
                          <td className="py-2">
                            <span className={cn("text-xs font-mono font-bold", faltaInfo.usadas >= 5 ? "text-destructive" : faltaInfo.usadas >= 3 ? "text-warning" : "text-muted-foreground")}>{faltaInfo.usadas}/5</span>
                          </td>
                          <td className="py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              s.status_presenca === "presente" ? "bg-success/10 text-success" :
                              s.status_presenca === "ferias" ? "bg-warning/10 text-warning" :
                              "bg-destructive/10 text-destructive"
                            }`}>{s.status_presenca}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MonitorUnidade() {
  return <MonitorContent />;
}
