import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";
import { supabase } from "@/integrations/supabase/client";
import type { ServidorDB, DiretoriaDB, UnidadeDB, FuncaoDB, AtestadoDB } from "@/hooks/useServidores";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Users, Clock, AlertTriangle, Palmtree, FileText,
  CheckCircle, Building2, ChevronDown, ChevronRight, Plus, X, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

function MonitorContent() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUnidadeId = searchParams.get("unidade") || "";

  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoDB[]>([]);
  const [atestados, setAtestados] = useState<AtestadoDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Atestado form
  const [showAtestadoForm, setShowAtestadoForm] = useState(false);
  const [atestadoForm, setAtestadoForm] = useState({ servidor_id: "", tipo: "médico", data_inicio: "", data_fim: "", dias: 1, observacao: "" });
  const [atestadoSearch, setAtestadoSearch] = useState("");

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
    const [d, u, f, a] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("funcoes").select("*").order("nome"),
      supabase.from("atestados").select("*").order("data_inicio", { ascending: false }),
    ]);
    setServidores(allSrv as ServidorDB[]);
    setDiretorias((d.data ?? []) as DiretoriaDB[]);
    setUnidades((u.data ?? []) as UnidadeDB[]);
    setFuncoes((f.data ?? []) as FuncaoDB[]);
    setAtestados((a.data ?? []) as AtestadoDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Filter servidores by selected unidade or show all
  const filteredServidores = useMemo(() => {
    if (!selectedUnidadeId) return servidores;
    return servidores.filter(s => s.unidade_id === selectedUnidadeId);
  }, [servidores, selectedUnidadeId]);

  const unidadeFuncoes = useMemo(() => {
    if (!selectedUnidadeId) return funcoes;
    return funcoes.filter(f => f.unidade_id === selectedUnidadeId);
  }, [funcoes, selectedUnidadeId]);

  // Who is on shift now (based on escala)
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
    if (start1 !== null && end1 !== null) {
      if (currentTimeMinutes >= start1 && currentTimeMinutes <= end1) return true;
    }
    if (start2 !== null && end2 !== null) {
      if (currentTimeMinutes >= start2 && currentTimeMinutes <= end2) return true;
    }
    return false;
  };

  const onShift = filteredServidores.filter(s => s.status_presenca === "presente" && isOnShift(s));
  const offShift = filteredServidores.filter(s => s.status_presenca === "presente" && !isOnShift(s));

  // Upcoming vacations (next 30 days)
  const upcomingVacations = useMemo(() => {
    const limit = addDays(today, 30);
    return filteredServidores.filter(s => {
      if (!s.ferias_periodo1_inicio) return false;
      try {
        const start = parseISO(s.ferias_periodo1_inicio);
        return isAfter(start, today) && isBefore(start, limit);
      } catch { return false; }
    }).sort((a, b) => (a.ferias_periodo1_inicio || "").localeCompare(b.ferias_periodo1_inicio || ""));
  }, [filteredServidores]);

  // Active atestados
  const activeAtestados = useMemo(() => {
    const srvIds = new Set(filteredServidores.map(s => s.id));
    return atestados.filter(a => {
      if (!srvIds.has(a.servidor_id)) return false;
      try {
        return isWithinInterval(today, { start: parseISO(a.data_inicio), end: parseISO(a.data_fim) });
      } catch { return false; }
    });
  }, [atestados, filteredServidores]);

  // Upcoming atestados ending soon (next 7 days)
  const endingSoonAtestados = useMemo(() => {
    const limit = addDays(today, 7);
    const srvIds = new Set(filteredServidores.map(s => s.id));
    return atestados.filter(a => {
      if (!srvIds.has(a.servidor_id)) return false;
      try {
        const end = parseISO(a.data_fim);
        return isAfter(end, today) && isBefore(end, limit);
      } catch { return false; }
    });
  }, [atestados, filteredServidores]);

  const getServidorNome = (id: string) => servidores.find(s => s.id === id)?.nome || "—";

  // Stats
  const presentes = filteredServidores.filter(s => s.status_presenca === "presente").length;
  const emFerias = filteredServidores.filter(s => s.status_presenca === "ferias").length;
  const afastados = filteredServidores.filter(s => s.status_presenca === "afastado").length;
  const totalHoras = filteredServidores.reduce((sum, s) => sum + (s.escala_total_horas || 0), 0);

  const addAtestado = async () => {
    if (!atestadoForm.servidor_id || !atestadoForm.data_inicio || !atestadoForm.data_fim) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("atestados").insert({
      servidor_id: atestadoForm.servidor_id,
      tipo: atestadoForm.tipo,
      data_inicio: atestadoForm.data_inicio,
      data_fim: atestadoForm.data_fim,
      dias: atestadoForm.dias,
      observacao: atestadoForm.observacao || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Atestado registrado!" });
    setShowAtestadoForm(false);
    setAtestadoForm({ servidor_id: "", tipo: "médico", data_inicio: "", data_fim: "", dias: 1, observacao: "" });
    loadData();
  };

  const filteredAtestadoServidores = atestadoSearch.length >= 2
    ? filteredServidores.filter(s => s.nome.toLowerCase().includes(atestadoSearch.toLowerCase())).slice(0, 10)
    : filteredServidores.slice(0, 10);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

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
              <p className="text-xs text-muted-foreground">Escalas, atestados e férias em tempo real</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Unidade selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <Building2 className="h-4 w-4 text-primary" />
          <select
            value={selectedUnidadeId}
            onChange={e => setSearchParams(e.target.value ? { unidade: e.target.value } : {})}
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          >
            <option value="">Todas as unidades (visão geral)</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{filteredServidores.length} servidores</span>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga Total</div>
            <p className="text-2xl font-bold text-foreground">{totalHoras}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* On shift now */}
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

          {/* Upcoming vacations */}
          <div className="rounded-xl border border-warning/30 bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warning flex items-center gap-2 mb-3">
              <Palmtree className="h-3.5 w-3.5" /> Férias próximas (30 dias) — {upcomingVacations.length}
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {upcomingVacations.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma férias nos próximos 30 dias.</p>}
              {upcomingVacations.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-warning/5 border border-warning/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{s.cargo}</p>
                  </div>
                  <span className="text-xs font-mono text-warning">
                    {s.ferias_periodo1_inicio} → {s.ferias_periodo1_fim}
                  </span>
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
              <button
                onClick={() => setShowAtestadoForm(true)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar
              </button>
            </div>

            {showAtestadoForm && (
              <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <div className="space-y-1">
                  <input
                    value={atestadoSearch}
                    onChange={e => setAtestadoSearch(e.target.value)}
                    placeholder="Buscar servidor..."
                    className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                  {!atestadoForm.servidor_id && (
                    <div className="max-h-28 overflow-y-auto bg-card rounded border border-border shadow-md">
                      {filteredAtestadoServidores.map(s => (
                        <button key={s.id} onClick={() => { setAtestadoForm(f => ({ ...f, servidor_id: s.id })); setAtestadoSearch(s.nome); }}
                          className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                          {s.nome} <span className="text-muted-foreground">({s.cargo})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Início</label>
                    <input type="date" value={atestadoForm.data_inicio} onChange={e => setAtestadoForm(f => ({ ...f, data_inicio: e.target.value }))}
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Fim</label>
                    <input type="date" value={atestadoForm.data_fim} onChange={e => setAtestadoForm(f => ({ ...f, data_fim: e.target.value }))}
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Tipo</label>
                    <select value={atestadoForm.tipo} onChange={e => setAtestadoForm(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none">
                      <option value="médico">Médico</option>
                      <option value="odontológico">Odontológico</option>
                      <option value="acompanhante">Acompanhante</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Dias</label>
                    <input type="number" min={1} value={atestadoForm.dias} onChange={e => setAtestadoForm(f => ({ ...f, dias: parseInt(e.target.value) || 1 }))}
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                  </div>
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
                  <div>
                    <p className="text-sm font-medium text-foreground">{getServidorNome(a.servidor_id)}</p>
                    <p className="text-[10px] text-muted-foreground">{a.tipo} · {a.dias} dia(s)</p>
                  </div>
                  <span className="text-xs font-mono text-destructive">
                    {a.data_inicio} → {a.data_fim}
                  </span>
                </div>
              ))}
            </div>

            {endingSoonAtestados.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-2">
                  Encerrando em 7 dias ({endingSoonAtestados.length})
                </h4>
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

        {/* Funções breakdown (if unidade selected) */}
        {selectedUnidadeId && unidadeFuncoes.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
              <Building2 className="h-3.5 w-3.5" /> Funções da Unidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unidadeFuncoes.map(f => {
                const fServidores = filteredServidores.filter(s => (s as any).funcao_id === f.id);
                const fPresentes = fServidores.filter(s => s.status_presenca === "presente").length;
                const fOnShift = fServidores.filter(s => s.status_presenca === "presente" && isOnShift(s)).length;
                return (
                  <div key={f.id} className="rounded-lg border border-border/50 p-3">
                    <h4 className="text-sm font-bold text-foreground mb-2">{f.nome}</h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{fServidores.length} total</span>
                      <span className="text-success font-medium">{fPresentes} presentes</span>
                      <span className="text-primary font-medium">{fOnShift} em serviço</span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {fServidores.slice(0, 5).map(s => (
                        <div key={s.id} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${s.status_presenca === "presente" ? "bg-success" : "bg-muted"}`} />
                          {s.nome}
                        </div>
                      ))}
                      {fServidores.length > 5 && <p className="text-[10px] text-muted-foreground">+{fServidores.length - 5} mais</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Carga horária individual */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
            <Clock className="h-3.5 w-3.5" /> Carga Horária Individual
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-semibold text-muted-foreground">Servidor</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Cargo</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Turno 1</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Turno 2</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Total</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredServidores.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 font-medium text-foreground">{s.nome}</td>
                    <td className="py-2 text-muted-foreground">{s.cargo}</td>
                    <td className="py-2 font-mono text-muted-foreground">{s.escala_inicio1 ? `${s.escala_inicio1}-${s.escala_fim1}` : "—"}</td>
                    <td className="py-2 font-mono text-muted-foreground">{s.escala_inicio2 ? `${s.escala_inicio2}-${s.escala_fim2}` : "—"}</td>
                    <td className="py-2 font-mono font-bold text-foreground">{s.escala_total_horas ? `${s.escala_total_horas}h` : "—"}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.status_presenca === "presente" ? "bg-success/10 text-success" :
                        s.status_presenca === "ferias" ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {s.status_presenca}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredServidores.length > 50 && (
              <p className="text-xs text-muted-foreground mt-2">Mostrando 50 de {filteredServidores.length}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MonitorUnidade() {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!session) return <LoginForm />;
  return <MonitorContent />;
}
