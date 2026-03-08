import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { ServidorDB, DiretoriaDB, UnidadeDB, FuncaoDB, AtestadoDB, FaltaAbonadaDB, AfastamentoDB } from "@/hooks/useServidores";
import { applyAutoPresenca, type EscalaSemanalRow } from "@/lib/presencaAutomatica";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Users, Clock, AlertTriangle, Palmtree, FileText,
  CheckCircle, Building2, ChevronDown, ChevronRight, Plus, X, Calendar,
  DollarSign, Eye, Shield, Ban, Pencil, Save, CalendarCheck, UserX, UserPlus, ArrowRightLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  calculateDailyHoursFromTimes,
  getCurrentDayAndMinutes,
  getServidorDailyHours,
  getServidorWorkingDaysLabel,
  getTodayShiftLabel,
  hasAnyEscalaConfigured,
  isServidorOnShiftNow,
} from "@/lib/escalaUtils";
import { EscalaSemanalEditor } from "@/components/EscalaSemanalEditor";
import { TransferServidorModal } from "@/components/TransferServidorModal";
import { isAfastadoLikeStatus } from "@/lib/presencaStatus";
import { calcularTotalDiasFerias } from "@/lib/feriasUtils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MonitorContent() {
  const { hasFinancialAccess, user, isAdmin, isDiretor, isCoordenador, servidorId, hasFullAccess, diretoriaIds: userDiretoriaIds, unidadeIds: userUnidadeIds } = useAuthSession();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get("view") || "tudo"; // tudo | diretoria | unidade
  const selectedDiretoriaId = searchParams.get("diretoria") || "";
  const selectedUnidadeId = searchParams.get("unidade") || "";
  const activeFilter = searchParams.get("filter") || ""; // presentes | ferias | afastados | ausentes | concursados | contratados | duplo_vinculo

  const [servidores, setServidores] = useState<ServidorDB[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoDB[]>([]);
  const [atestados, setAtestados] = useState<AtestadoDB[]>([]);
  const [faltasAbonadas, setFaltasAbonadas] = useState<FaltaAbonadaDB[]>([]);
  const [afastamentos, setAfastamentos] = useState<AfastamentoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [coordUniData, setCoordUniData] = useState<{ servidor_id: string; unidade_id: string }[]>([]);
  const [servidoresUnidades, setServidoresUnidades] = useState<{ servidor_id: string; unidade_id: string }[]>([]);
  const [escalasSemanais, setEscalasSemanais] = useState<EscalaSemanalRow[]>([]);

  // Atestado form
  const [showAtestadoForm, setShowAtestadoForm] = useState(false);
  const [atestadoForm, setAtestadoForm] = useState({ servidor_id: "", tipo: "médico", data_inicio: "", data_fim: "", dias: 1, observacao: "" });
  const [atestadoSearch, setAtestadoSearch] = useState("");

  // Falta abonada form
  const [showFaltaForm, setShowFaltaForm] = useState(false);
  const [faltaForm, setFaltaForm] = useState({ servidor_id: "", data: "", observacao: "" });
  const [faltaSearch, setFaltaSearch] = useState("");

  // Afastamento form
  const MOTIVOS_AFASTAMENTO = [
    "Licença Maternidade", "Licença Paternidade", "Licença Sem Vencimento",
    "Licença Prêmio", "Licença para Tratamento de Saúde", "Suspensão Disciplinar",
    "Cessão", "Curso/Capacitação", "Licença por Interesse Particular",
    "Licença Nojo (Falecimento)", "Licença Casamento", "Outro"
  ];
  const [showAfastamentoForm, setShowAfastamentoForm] = useState(false);
  const [afastamentoForm, setAfastamentoForm] = useState({ servidor_id: "", motivo: "Licença para Tratamento de Saúde", data_inicio: "", data_fim: "", observacao: "" });
  const [afastamentoSearch, setAfastamentoSearch] = useState("");

  // Bulk edit escalas
  const [showBulkEscala, setShowBulkEscala] = useState(false);
  const [bulkEscalas, setBulkEscalas] = useState<Record<string, { inicio1: string; fim1: string; inicio2: string; fim2: string; total: string }>>({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [expandedSemanalId, setExpandedSemanalId] = useState<string | null>(null);

  // Bulk férias
  const [showBulkFerias, setShowBulkFerias] = useState(false);
  const [bulkFerias, setBulkFerias] = useState<Record<string, { status: string; p1_inicio: string; p1_fim: string; p2_inicio: string; p2_fim: string; total_dias: string; vencidas: string }>>({});
  const [savingBulkFerias, setSavingBulkFerias] = useState(false);

  // Bulk allocation
  const [showBulkAlloc, setShowBulkAlloc] = useState(false);
  const [allocSearch, setAllocSearch] = useState("");
  const [allocSelectedIds, setAllocSelectedIds] = useState<Set<string>>(new Set());
  const [allocTargetUnidade, setAllocTargetUnidade] = useState("");
  const [savingAlloc, setSavingAlloc] = useState(false);

  // Expanded diretorias
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  // Collapsed alerts
  const [alertEscalaOpen, setAlertEscalaOpen] = useState(true);
  const [alertFeriasOpen, setAlertFeriasOpen] = useState(true);

  // Transfer modal
  const [transferServidor, setTransferServidor] = useState<ServidorDB | null>(null);

  // Determine user's diretoria (use first from array for backwards compat)
  const userDiretoriaId = userDiretoriaIds[0] ?? null;
  const canTransfer = isAdmin || (isDiretor && !!selectedDiretoriaId && (selectedDiretoriaId === userDiretoriaId || hasFullAccess));

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
    const [d, u, f, a, fa, af, cu, su, es] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("funcoes").select("*").order("nome"),
      supabase.from("atestados").select("*").order("data_inicio", { ascending: false }),
      supabase.from("faltas_abonadas").select("*").order("data", { ascending: false }),
      supabase.from("afastamentos").select("*").order("data_inicio", { ascending: false }),
      supabase.from("coordenadores_unidades").select("*"),
      supabase.from("servidores_unidades").select("servidor_id, unidade_id"),
      supabase.from("escalas_semanais").select("servidor_id, dia_semana, entrada1, saida1, entrada2, saida2"),
    ]);
    setServidores(allSrv as ServidorDB[]);
    setDiretorias((d.data ?? []) as DiretoriaDB[]);
    setUnidades((u.data ?? []) as UnidadeDB[]);
    setFuncoes((f.data ?? []) as FuncaoDB[]);
    setAtestados((a.data ?? []) as AtestadoDB[]);
    setFaltasAbonadas((fa.data ?? []) as FaltaAbonadaDB[]);
    setAfastamentos((af.data ?? []) as AfastamentoDB[]);
    setCoordUniData((cu.data ?? []) as { servidor_id: string; unidade_id: string }[]);
    setServidoresUnidades((su.data ?? []) as { servidor_id: string; unidade_id: string }[]);
    setEscalasSemanais((es.data ?? []) as EscalaSemanalRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("monitor-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "servidores" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "diretorias" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "unidades" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "funcoes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "atestados" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "faltas_abonadas" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "afastamentos" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "coordenadores_unidades" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "servidores_unidades" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas_semanais" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Auto-navigate coordenador to their assigned unit
  const [coordUnidades, setCoordUnidades] = useState<string[]>([]);
  useEffect(() => {
    if (!isCoordenador || !servidorId) return;
    supabase.from("coordenadores_unidades").select("unidade_id").eq("servidor_id", servidorId).then(({ data }) => {
      const ids = (data ?? []).map(d => d.unidade_id);
      setCoordUnidades(ids);
      // Auto-navigate to first unit if no view selected
      if (ids.length === 1 && !searchParams.get("view") && !searchParams.get("unidade")) {
        const uni = unidades.find(u => u.id === ids[0]);
        if (uni) setView("unidade", uni.diretoria_id, uni.id);
      }
    });
  }, [isCoordenador, servidorId, unidades]);

  // Permission: can edit escalas/férias
  const canEditEscalasFerias = hasFullAccess || isCoordenador;

  const today = new Date();
  const todayDateKey = format(today, "yyyy-MM-dd");

  const toDateKey = useCallback((value: string | null | undefined): string | null => {
    if (!value) return null;
    const direct = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct?.[1]) return direct[1];

    try {
      const parsed = parseISO(value);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // ignore parse errors
    }

    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    return format(fallback, "yyyy-MM-dd");
  }, []);

  const isTodayWithinRange = useCallback((startRaw: string | null | undefined, endRaw: string | null | undefined) => {
    const start = toDateKey(startRaw);
    const end = toDateKey(endRaw);
    if (!start || !end) return false;
    return todayDateKey >= start && todayDateKey <= end;
  }, [todayDateKey, toDateKey]);

  const servidorUnidadeIdsByServidor = useMemo(() => {
    const map = new Map<string, Set<string>>();
    servidores.forEach((s) => {
      const ids = new Set<string>();
      if (s.unidade_id) ids.add(s.unidade_id);
      map.set(s.id, ids);
    });
    servidoresUnidades.forEach(({ servidor_id, unidade_id }) => {
      const ids = map.get(servidor_id) ?? new Set<string>();
      ids.add(unidade_id);
      map.set(servidor_id, ids);
    });
    return map;
  }, [servidores, servidoresUnidades]);

  const unidadeToDiretoria = useMemo(() => new Map(unidades.map((u) => [u.id, u.diretoria_id])), [unidades]);

  const isServidorNaUnidade = useCallback(
    (servidorId: string, unidadeId: string) => servidorUnidadeIdsByServidor.get(servidorId)?.has(unidadeId) ?? false,
    [servidorUnidadeIdsByServidor],
  );

  const isServidorNaDiretoria = useCallback((servidor: ServidorDB, diretoriaId: string) => {
    if (servidor.diretoria_id === diretoriaId) return true;
    const unidadeIds = servidorUnidadeIdsByServidor.get(servidor.id);
    if (!unidadeIds) return false;
    for (const unidadeId of unidadeIds) {
      if (unidadeToDiretoria.get(unidadeId) === diretoriaId) return true;
    }
    return false;
  }, [servidorUnidadeIdsByServidor, unidadeToDiretoria]);

  // ── Role-based access filtering ──
  const allowedDiretorias = useMemo(() => {
    if (isAdmin) return diretorias;
    if (isDiretor && userDiretoriaIds.length > 0) {
      return diretorias.filter(d => userDiretoriaIds.includes(d.id));
    }
    if (isCoordenador && userUnidadeIds.length > 0) {
      const dirIds = unidades.filter(u => userUnidadeIds.includes(u.id)).map(u => u.diretoria_id);
      return diretorias.filter(d => dirIds.includes(d.id));
    }
    return diretorias;
  }, [diretorias, unidades, isAdmin, isDiretor, isCoordenador, userDiretoriaIds, userUnidadeIds]);

  const allowedUnidades = useMemo(() => {
    if (isAdmin) return unidades;
    if (isDiretor && userDiretoriaIds.length > 0) {
      return unidades.filter(u => userDiretoriaIds.includes(u.diretoria_id));
    }
    if (isCoordenador && userUnidadeIds.length > 0) {
      return unidades.filter(u => userUnidadeIds.includes(u.id));
    }
    return unidades;
  }, [unidades, isAdmin, isDiretor, isCoordenador, userDiretoriaIds, userUnidadeIds]);

  const allowedServidoresRaw = useMemo(() => {
    if (isAdmin) return servidores;
    if (isDiretor && userDiretoriaIds.length > 0) {
      return servidores.filter(s => userDiretoriaIds.some((dirId) => isServidorNaDiretoria(s, dirId)));
    }
    if (isCoordenador && userUnidadeIds.length > 0) {
      return servidores.filter(s => userUnidadeIds.some((uniId) => isServidorNaUnidade(s.id, uniId)));
    }
    return servidores;
  }, [servidores, isAdmin, isDiretor, isCoordenador, userDiretoriaIds, userUnidadeIds, isServidorNaDiretoria, isServidorNaUnidade]);

  // Apply auto-presence based on escalas + férias/atestados/afastamentos/faltas
  const allowedServidores = useMemo(
    () => applyAutoPresenca(allowedServidoresRaw, escalasSemanais, new Date(), { atestados, afastamentos, faltasAbonadas }),
    [allowedServidoresRaw, escalasSemanais, atestados, afastamentos, faltasAbonadas],
  );

  // Filter servidores based on view
  const filteredServidores = useMemo(() => {
    let result = allowedServidores;
    if (selectedUnidadeId) result = result.filter(s => isServidorNaUnidade(s.id, selectedUnidadeId));
    else if (selectedDiretoriaId) result = result.filter(s => isServidorNaDiretoria(s, selectedDiretoriaId));

    if (activeFilter === "presentes") result = result.filter(s => s.status_presenca === "presente");
    else if (activeFilter === "ferias") result = result.filter(s => s.status_presenca === "ferias");
    else if (activeFilter === "afastados") result = result.filter(s => isAfastadoLikeStatus(s.status_presenca));
    else if (activeFilter === "ausentes") result = result.filter(s => s.status_presenca === "ausente");
    else if (activeFilter === "folga") result = result.filter(s => s.status_presenca === "folga");
    else if (activeFilter === "concursados") result = result.filter(s => (s.vinculo || "").includes("CONCURSADO"));
    else if (activeFilter === "contratados") result = result.filter(s => (s.vinculo || "").includes("CONTRATO"));
    else if (activeFilter === "duplo_vinculo") result = result.filter(s => s.duplo_vinculo);

    return result;
  }, [allowedServidores, selectedUnidadeId, selectedDiretoriaId, activeFilter, isServidorNaUnidade, isServidorNaDiretoria]);

  // Time helpers (timezone aligned with auto-presence)
  const { dayOfWeek: todayDayOfWeek, nowMinutes: currentTimeMinutes } = getCurrentDayAndMinutes("America/Campo_Grande", today);

  const isOnShift = (s: ServidorDB) =>
    isServidorOnShiftNow({
      servidor: s,
      escalas: escalasSemanais,
      dayOfWeek: todayDayOfWeek,
      nowMinutes: currentTimeMinutes,
    });

  const getShiftLabel = (s: ServidorDB): string =>
    getTodayShiftLabel({
      servidor: s,
      escalas: escalasSemanais,
      dayOfWeek: todayDayOfWeek,
    });

  const formatHours = (hours: number): string => {
    if (hours <= 0) return "—";
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  };

  const getCargaHorariaDiaria = (s: ServidorDB): number =>
    getServidorDailyHours({ servidor: s, escalas: escalasSemanais, dayOfWeek: todayDayOfWeek });

  const getDiasTrabalhados = (s: ServidorDB): string =>
    getServidorWorkingDaysLabel({ servidor: s, escalas: escalasSemanais });

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
    const srvIds = new Set(filteredServidores.map((s) => s.id));
    return atestados.filter((a) => {
      if (!srvIds.has(a.servidor_id)) return false;
      return isTodayWithinRange(a.data_inicio, a.data_fim);
    });
  }, [atestados, filteredServidores, isTodayWithinRange]);

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
  const afastados = filteredServidores.filter(s => isAfastadoLikeStatus(s.status_presenca)).length;
  const totalHoras = filteredServidores.reduce((sum, s) => sum + (s.escala_total_horas || 0), 0);
  const totalFolha = filteredServidores.reduce((sum, s) => sum + (s.salario || 0), 0);

  const addAtestado = async () => {
    if (!atestadoForm.servidor_id || !atestadoForm.data_inicio || !atestadoForm.data_fim) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return;
    }

    if (atestadoForm.data_fim < atestadoForm.data_inicio) {
      toast({ title: "Período inválido", description: "A data final do atestado não pode ser menor que a data inicial.", variant: "destructive" });
      return;
    }

    const diasCalculados = differenceInDays(parseISO(atestadoForm.data_fim), parseISO(atestadoForm.data_inicio)) + 1;

    const { error } = await supabase.from("atestados").insert({
      servidor_id: atestadoForm.servidor_id, tipo: atestadoForm.tipo,
      data_inicio: atestadoForm.data_inicio, data_fim: atestadoForm.data_fim,
      dias: diasCalculados > 0 ? diasCalculados : atestadoForm.dias,
      observacao: atestadoForm.observacao || null,
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

  const filteredAfastamentoServidores = afastamentoSearch.length >= 2
    ? filteredServidores.filter(s => s.nome.toLowerCase().includes(afastamentoSearch.toLowerCase())).slice(0, 10)
    : filteredServidores.slice(0, 10);

  const activeAfastamentos = useMemo(() => {
    const srvIds = new Set(filteredServidores.map((s) => s.id));
    return afastamentos.filter((a) => {
      if (!srvIds.has(a.servidor_id)) return false;
      const inicio = toDateKey(a.data_inicio);
      if (!inicio) return false;

      if (a.data_fim) {
        return isTodayWithinRange(a.data_inicio, a.data_fim);
      }

      return todayDateKey >= inicio;
    });
  }, [afastamentos, filteredServidores, toDateKey, isTodayWithinRange, todayDateKey]);

  const addAfastamento = async () => {
    if (!afastamentoForm.servidor_id || !afastamentoForm.data_inicio || !afastamentoForm.motivo) {
      toast({ title: "Preencha servidor, motivo e data de início", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("afastamentos").insert({
      servidor_id: afastamentoForm.servidor_id,
      motivo: afastamentoForm.motivo,
      data_inicio: afastamentoForm.data_inicio,
      data_fim: afastamentoForm.data_fim || null,
      observacao: afastamentoForm.observacao || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    // Also update servidor status to afastado
    await supabase.from("servidores").update({ status_presenca: "afastado" }).eq("id", afastamentoForm.servidor_id);
    toast({ title: "Afastamento registrado!" });
    setShowAfastamentoForm(false);
    setAfastamentoForm({ servidor_id: "", motivo: "Licença para Tratamento de Saúde", data_inicio: "", data_fim: "", observacao: "" });
    setAfastamentoSearch("");
    loadData();
  };

  const finalizarAfastamento = async (afastamentoId: string, servidorId: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    await supabase.from("afastamentos").update({ data_fim: todayStr }).eq("id", afastamentoId);
    await supabase.from("servidores").update({ status_presenca: "presente" }).eq("id", servidorId);
    toast({ title: "Afastamento finalizado, servidor marcado como presente!" });
    loadData();
  };

  const updateBulkEscalaTime = useCallback((servidorId: string, key: "inicio1" | "fim1" | "inicio2" | "fim2", value: string) => {
    setBulkEscalas(prev => {
      const current = prev[servidorId] ?? { inicio1: "", fim1: "", inicio2: "", fim2: "", total: "" };
      const updated = { ...current, [key]: value };
      const totalDia = calculateDailyHoursFromTimes({
        entrada1: updated.inicio1,
        saida1: updated.fim1,
        entrada2: updated.inicio2,
        saida2: updated.fim2,
      });

      return {
        ...prev,
        [servidorId]: {
          ...updated,
          total: totalDia > 0 ? String(totalDia) : "",
        },
      };
    });
  }, []);

  // Bulk escala save
  const initBulkEscalas = () => {
    const initial: Record<string, any> = {};
    filteredServidores.forEach(s => {
      const totalDia = calculateDailyHoursFromTimes({
        entrada1: s.escala_inicio1,
        saida1: s.escala_fim1,
        entrada2: s.escala_inicio2,
        saida2: s.escala_fim2,
      });

      initial[s.id] = {
        inicio1: s.escala_inicio1 || "",
        fim1: s.escala_fim1 || "",
        inicio2: s.escala_inicio2 || "",
        fim2: s.escala_fim2 || "",
        total: totalDia > 0 ? String(totalDia) : (s.escala_total_horas?.toString() || ""),
      };
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
        escala_total_horas: esc.total ? parseFloat(esc.total) : null,
      }).eq("id", id);
      if (!error) count++;
    }
    setSavingBulk(false);
    toast({ title: `${count} escalas atualizadas!` });
    setShowBulkEscala(false);
    loadData();
  };

  // Bulk férias functions
  const initBulkFerias = () => {
    const initial: Record<string, any> = {};
    filteredServidores.forEach(s => {
      initial[s.id] = {
        status: s.ferias_status_gerencial || "",
        p1_inicio: s.ferias_periodo1_inicio || "",
        p1_fim: s.ferias_periodo1_fim || "",
        p2_inicio: s.ferias_periodo2_inicio || "",
        p2_fim: s.ferias_periodo2_fim || "",
        total_dias: s.ferias_total_dias?.toString() || "",
        vencidas: s.ferias_vencidas?.toString() || "",
      };
    });
    setBulkFerias(initial);
    setShowBulkFerias(true);
  };

  const saveBulkFerias = async () => {
    setSavingBulkFerias(true);
    let count = 0;
    const entries = Object.entries(bulkFerias);
    for (let i = 0; i < entries.length; i += 10) {
      const batch = entries.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(([id, f]) => {
          const totalDiasAuto = calcularTotalDiasFerias({
            periodo1Inicio: f.p1_inicio,
            periodo1Fim: f.p1_fim,
            periodo2Inicio: f.p2_inicio,
            periodo2Fim: f.p2_fim,
          });

          return supabase.from("servidores").update({
            ferias_status_gerencial: f.status || null,
            ferias_periodo1_inicio: f.p1_inicio || null,
            ferias_periodo1_fim: f.p1_fim || null,
            ferias_periodo2_inicio: f.p2_inicio || null,
            ferias_periodo2_fim: f.p2_fim || null,
            ferias_total_dias: totalDiasAuto ?? (f.total_dias ? parseInt(f.total_dias, 10) : null),
            ferias_vencidas: f.vencidas ? parseInt(f.vencidas, 10) : null,
          }).eq("id", id);
        })
      );
      for (const r of results) { if (!r.error) count++; }
    }
    setSavingBulkFerias(false);
    toast({ title: `Férias de ${count} servidores atualizadas!` });
    setShowBulkFerias(false);
    loadData();
  };

  // Bulk allocation: alocar servidores a diretoria + unidade
  const bulkAllocate = async () => {
    if (allocSelectedIds.size === 0) {
      toast({ title: "Selecione pelo menos um servidor", variant: "destructive" }); return;
    }
    setSavingAlloc(true);
    const ids = Array.from(allocSelectedIds);
    const updateData: any = { diretoria_id: selectedDiretoriaId || null };
    if (allocTargetUnidade) updateData.unidade_id = allocTargetUnidade;
    if (selectedUnidadeId) {
      updateData.unidade_id = selectedUnidadeId;
      updateData.diretoria_id = selectedDiretoriaId;
    }
    // Batch update in chunks of 50
    let count = 0;
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const { error } = await supabase.from("servidores").update(updateData).in("id", batch);
      if (!error) count += batch.length;
    }
    setSavingAlloc(false);
    toast({ title: `${count} servidor(es) alocado(s)!` });
    setShowBulkAlloc(false);
    setAllocSelectedIds(new Set());
    setAllocSearch("");
    setAllocTargetUnidade("");
    loadData();
  };

  // Servidores available for allocation (not yet in this diretoria/unidade)
  const allocAvailableServidores = useMemo(() => {
    let pool = servidores;
    if (selectedUnidadeId) {
      pool = servidores.filter(s => s.unidade_id !== selectedUnidadeId);
    } else if (selectedDiretoriaId) {
      pool = servidores.filter(s => s.diretoria_id !== selectedDiretoriaId);
    }
    if (allocSearch.length >= 2) {
      pool = pool.filter(s => s.nome.toLowerCase().includes(allocSearch.toLowerCase()));
    }
    return pool.slice(0, 50);
  }, [servidores, selectedDiretoriaId, selectedUnidadeId, allocSearch]);


  // Servidores sem escala ou férias
  const hasEscalaCompleta = useCallback(
    (s: ServidorDB) => hasAnyEscalaConfigured(s, escalasSemanais),
    [escalasSemanais],
  );

  const semEscala = useMemo(() => filteredServidores.filter(s => !hasEscalaCompleta(s)), [filteredServidores, hasEscalaCompleta]);
  const semFerias = useMemo(() => filteredServidores.filter(s => !s.ferias_ano_referencia && !s.ferias_periodo1_inicio), [filteredServidores]);

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

  // ── Faltas abonadas ativas no ciclo atual ──
  const activeFaltasAbonadas = useMemo(() => {
    const srvIds = new Set(filteredServidores.map(s => s.id));
    const now = new Date();
    return faltasAbonadas.filter(f => {
      if (!srvIds.has(f.servidor_id)) return false;
      const srv = servidores.find(s => s.id === f.servidor_id);
      if (!srv) return false;
      const admDate = srv.data_admissao ? parseISO(srv.data_admissao) : null;
      let cycleStart: Date;
      if (admDate) {
        cycleStart = new Date(now.getFullYear(), admDate.getMonth(), admDate.getDate());
        if (isAfter(cycleStart, now)) cycleStart.setFullYear(cycleStart.getFullYear() - 1);
      } else {
        cycleStart = new Date(now.getFullYear(), 0, 1);
      }
      try { const fd = parseISO(f.data); return !isBefore(fd, cycleStart) && !isAfter(fd, now); } catch { return false; }
    });
  }, [faltasAbonadas, filteredServidores, servidores]);

  // ── Conflitos: férias cruzando com atestado ou falta abonada ──
  const conflictsData = useMemo(() => {
    const conflicts: { servidor: ServidorDB; tipo: string; detalhe: string }[] = [];
    const srvIds = new Set(filteredServidores.map(s => s.id));

    filteredServidores.forEach(srv => {
      if (srv.status_presenca !== "ferias" && !srv.ferias_periodo1_inicio) return;
      // Build férias intervals
      const fIntervals: { start: Date; end: Date }[] = [];
      if (srv.ferias_periodo1_inicio && srv.ferias_periodo1_fim) {
        try { fIntervals.push({ start: parseISO(srv.ferias_periodo1_inicio), end: parseISO(srv.ferias_periodo1_fim) }); } catch {}
      }
      if (srv.ferias_periodo2_inicio && srv.ferias_periodo2_fim) {
        try { fIntervals.push({ start: parseISO(srv.ferias_periodo2_inicio), end: parseISO(srv.ferias_periodo2_fim) }); } catch {}
      }
      if (fIntervals.length === 0) return;

      // Check atestados overlap
      atestados.filter(a => a.servidor_id === srv.id).forEach(at => {
        try {
          const atStart = parseISO(at.data_inicio);
          const atEnd = parseISO(at.data_fim);
          fIntervals.forEach(fi => {
            if (isBefore(atStart, fi.end) && isAfter(atEnd, fi.start)) {
              conflicts.push({
                servidor: srv,
                tipo: "Férias × Atestado",
                detalhe: `Atestado ${format(atStart, "dd/MM")}–${format(atEnd, "dd/MM")} cruza com férias ${format(fi.start, "dd/MM")}–${format(fi.end, "dd/MM")}`
              });
            }
          });
        } catch {}
      });

      // Check faltas abonadas overlap
      faltasAbonadas.filter(f => f.servidor_id === srv.id).forEach(fa => {
        try {
          const faDate = parseISO(fa.data);
          fIntervals.forEach(fi => {
            if (isWithinInterval(faDate, { start: fi.start, end: fi.end })) {
              conflicts.push({
                servidor: srv,
                tipo: "Férias × Falta Abonada",
                detalhe: `Falta abonada em ${format(faDate, "dd/MM")} durante férias ${format(fi.start, "dd/MM")}–${format(fi.end, "dd/MM")}`
              });
            }
          });
        } catch {}
      });

      // Check afastamento overlap with férias
      afastamentos.filter(a => a.servidor_id === srv.id).forEach(af => {
        try {
          const afStart = parseISO(af.data_inicio);
          const afEnd = af.data_fim ? parseISO(af.data_fim) : addDays(new Date(), 365);
          fIntervals.forEach(fi => {
            if (isBefore(afStart, fi.end) && isAfter(afEnd, fi.start)) {
              conflicts.push({
                servidor: srv,
                tipo: "Férias × Afastamento",
                detalhe: `${af.motivo} ${format(afStart, "dd/MM")}${af.data_fim ? "–" + format(parseISO(af.data_fim), "dd/MM") : " (aberto)"} cruza com férias ${format(fi.start, "dd/MM")}–${format(fi.end, "dd/MM")}`
              });
            }
          });
        } catch {}
      });
    });

    return conflicts;
  }, [filteredServidores, atestados, faltasAbonadas, afastamentos]);

  // Navigation
  const setView = (mode: string, dirId?: string, uniId?: string) => {
    const params: Record<string, string> = { view: mode };
    if (dirId) params.diretoria = dirId;
    if (uniId) params.unidade = uniId;
    setSearchParams(params);
  };

  // Payroll card for a group of servidores
  const PayrollCard = ({ servs, label }: { servs: ServidorDB[]; label: string }) => {
    if (!hasFinancialAccess) return null;
    const folha = servs.reduce((sum, s) => sum + (s.salario || 0), 0);
    const count = servs.length;
    return (
      <div className="rounded-xl border border-border bg-card p-4 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <DollarSign className="h-3.5 w-3.5 text-primary flex-shrink-0" /> <span className="truncate">{label}</span>
        </div>
        <p className="text-lg font-bold text-foreground font-mono truncate">{formatCurrency(folha)}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span>{count} servidores</span>
        </div>
      </div>
    );
  };

  // Unit summary card (used in hierarchy view)
  const UnitSummaryCard = ({ uni }: { uni: UnidadeDB }) => {
    const uniServs = allowedServidores.filter(s => isServidorNaUnidade(s.id, uni.id));
    const uniPresentes = uniServs.filter(s => s.status_presenca === "presente").length;
    const uniFolha = uniServs.reduce((sum, s) => sum + (s.salario || 0), 0);
    const pct = uniServs.length > 0 ? Math.round((uniPresentes / uniServs.length) * 100) : 0;
    const pctColor = pct >= 80 ? "text-success bg-success/10" : pct >= 50 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";

    // Find coordinators for this unit
    const uniCoordIds = [...new Set(coordUniData.filter(cu => cu.unidade_id === uni.id).map(cu => cu.servidor_id))];
    const uniCoords = uniCoordIds.map(id => servidores.find(s => s.id === id)).filter(Boolean) as ServidorDB[];

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
        {uniCoords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {uniCoords.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-accent text-accent-foreground">
                👤 {c.nome.split(" ").slice(0, 2).join(" ")}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {uniServs.length}</span>
          <span className="flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" /> {uniPresentes}</span>
          {hasFinancialAccess && uniFolha > 0 && <span className="flex items-center gap-1 text-primary"><DollarSign className="h-3 w-3" /> {formatCurrency(uniFolha)}</span>}
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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/" className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors flex-shrink-0">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">Monitor de Unidade</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Escalas, atestados, férias e folha em tempo real</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
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
              {(() => {
                const uCoordIds = [...new Set(coordUniData.filter(cu => cu.unidade_id === currentUnidade.id).map(cu => cu.servidor_id))];
                const uCoords = uCoordIds.map(id => servidores.find(s => s.id === id)).filter(Boolean) as ServidorDB[];
                return uCoords.length > 0 ? (
                  <div className="flex flex-wrap gap-1 ml-1">
                    {uCoords.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium bg-accent text-accent-foreground">
                        👤 {c.nome.split(" ").slice(0, 2).join(" ")}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
            </>
          )}
        </div>

        {/* Active filter banner */}
        {activeFilter && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
            <span className="text-xs font-semibold text-primary">
              Filtro ativo: <span className="uppercase">{activeFilter.replace("_", " ")}</span>
            </span>
            <span className="text-xs text-muted-foreground">({filteredServidores.length} servidores)</span>
            <button
              onClick={() => { const p = new URLSearchParams(searchParams); p.delete("filter"); setSearchParams(p); }}
              className="ml-auto flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <X className="h-3 w-3" /> Limpar filtro
            </button>
          </div>
        )}

        {/* ═══ VISÃO GERAL ═══ */}
        {viewMode === "tudo" && !selectedDiretoriaId && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /> Total</div>
                <p className="text-2xl font-bold text-foreground">{allowedServidores.length.toLocaleString("pt-BR")}</p>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-xs text-success mb-1"><CheckCircle className="h-3.5 w-3.5" /> Presentes</div>
                <p className="text-2xl font-bold text-success">{allowedServidores.filter(s => s.status_presenca === "presente").length}</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 text-xs text-warning mb-1"><Palmtree className="h-3.5 w-3.5" /> Férias</div>
                <p className="text-2xl font-bold text-warning">{allowedServidores.filter(s => s.status_presenca === "ferias").length}</p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-xs text-destructive mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Afastados</div>
                <p className="text-2xl font-bold text-destructive">{allowedServidores.filter(s => isAfastadoLikeStatus(s.status_presenca)).length}</p>
              </div>
              <div className="rounded-xl border border-info/30 bg-info/5 p-4">
                <div className="flex items-center gap-2 text-xs text-info mb-1"><FileText className="h-3.5 w-3.5" /> Atestados</div>
                <p className="text-2xl font-bold text-info">{activeAtestados.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ativos hoje</p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 mb-1"><CalendarCheck className="h-3.5 w-3.5" /> Abonadas</div>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{activeFaltasAbonadas.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">no ciclo atual</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga Total</div>
                <p className="text-2xl font-bold text-foreground">{allowedServidores.reduce((s, sv) => s + (sv.escala_total_horas || 0), 0)}h</p>
              </div>
              {hasFinancialAccess && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs text-primary mb-1"><DollarSign className="h-3.5 w-3.5" /> Folha Total</div>
                <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(allowedServidores.reduce((s, sv) => s + (sv.salario || 0), 0))}</p>
              </div>
              )}
            </div>

            {/* Conflitos de datas */}
            {conflictsData.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                    ⚠ Conflitos de Datas — {conflictsData.length} ocorrência{conflictsData.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {conflictsData.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                      <span className="text-[10px] font-bold text-destructive whitespace-nowrap mt-0.5">{c.tipo}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{c.servidor.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{c.detalhe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {semEscala.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10">
                <button onClick={() => setAlertEscalaOpen(!alertEscalaOpen)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      ⚠ Sem escala — {semEscala.length} servidor{semEscala.length > 1 ? "es" : ""}
                    </span>
                  </div>
                  {alertEscalaOpen ? <ChevronDown className="h-4 w-4 text-amber-600" /> : <ChevronRight className="h-4 w-4 text-amber-600" />}
                </button>
                {alertEscalaOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {semEscala.slice(0, 15).map(s => (
                      <span key={s.id} className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-200 rounded-md px-2 py-0.5">{s.nome}</span>
                    ))}
                    {semEscala.length > 15 && <span className="text-[10px] text-amber-600/60 self-center">+{semEscala.length - 15} mais</span>}
                  </div>
                )}
              </div>
            )}

            {semFerias.length > 0 && (
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10">
                <button onClick={() => setAlertFeriasOpen(!alertFeriasOpen)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Palmtree className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                      ⚠ Férias não atualizadas — {semFerias.length} servidor{semFerias.length > 1 ? "es" : ""}
                    </span>
                  </div>
                  {alertFeriasOpen ? <ChevronDown className="h-4 w-4 text-orange-600" /> : <ChevronRight className="h-4 w-4 text-orange-600" />}
                </button>
                {alertFeriasOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {semFerias.slice(0, 15).map(s => (
                      <span key={s.id} className="text-[11px] bg-orange-500/15 text-orange-800 dark:text-orange-200 rounded-md px-2 py-0.5">{s.nome}</span>
                    ))}
                    {semFerias.length > 15 && <span className="text-[10px] text-orange-600/60 self-center">+{semFerias.length - 15} mais</span>}
                  </div>
                )}
              </div>
            )}

            {/* Diretorias grid */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Diretorias</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allowedDiretorias.map(dir => {
                  const dirServs = allowedServidores.filter(s => isServidorNaDiretoria(s, dir.id));
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
                      {hasFinancialAccess && dirFolha > 0 && (
                        <p className="mt-2 text-xs font-mono font-bold text-primary">{formatCurrency(dirFolha)}</p>
                      )}
                    </button>
                  );
                })}

                {/* Sem diretoria */}
                {isAdmin && (() => {
                  const semDir = allowedServidores.filter(s => !s.diretoria_id);
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
                      {hasFinancialAccess && folha > 0 && <p className="mt-2 text-xs font-mono font-bold text-warning">{formatCurrency(folha)}</p>}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Auto-redirect coordinator to their unit if only one allowed diretoria */}
            {isCoordenador && allowedDiretorias.length === 1 && allowedUnidades.length > 0 && (() => {
              // Auto-show units for the coordinator's single diretoria
              return (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Suas Unidades</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allowedUnidades.map(uni => (
                      <UnitSummaryCard key={uni.id} uni={uni} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ DIRETORIA VIEW ═══ */}
        {selectedDiretoriaId && !selectedUnidadeId && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
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
              <div className="rounded-xl border border-info/30 bg-info/5 p-4">
                <div className="flex items-center gap-2 text-xs text-info mb-1"><FileText className="h-3.5 w-3.5" /> Atestados</div>
                <p className="text-2xl font-bold text-info">{activeAtestados.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ativos hoje</p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 mb-1"><CalendarCheck className="h-3.5 w-3.5" /> Abonadas</div>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{activeFaltasAbonadas.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">no ciclo atual</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga</div>
                <p className="text-2xl font-bold text-foreground">{totalHoras}h</p>
              </div>
              <PayrollCard servs={filteredServidores} label="Folha Diretoria" />
            </div>

            {/* Conflitos de datas */}
            {conflictsData.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                    ⚠ Conflitos de Datas — {conflictsData.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {conflictsData.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                      <span className="text-[10px] font-bold text-destructive whitespace-nowrap mt-0.5">{c.tipo}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{c.servidor.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{c.detalhe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {semEscala.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10">
                <button onClick={() => setAlertEscalaOpen(!alertEscalaOpen)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      ⚠ Sem escala — {semEscala.length} servidor{semEscala.length > 1 ? "es" : ""}
                    </span>
                  </div>
                  {alertEscalaOpen ? <ChevronDown className="h-4 w-4 text-amber-600" /> : <ChevronRight className="h-4 w-4 text-amber-600" />}
                </button>
                {alertEscalaOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {semEscala.slice(0, 15).map(s => (
                      <span key={s.id} className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-200 rounded-md px-2 py-0.5">{s.nome}</span>
                    ))}
                    {semEscala.length > 15 && <span className="text-[10px] text-amber-600/60 self-center">+{semEscala.length - 15} mais</span>}
                  </div>
                )}
              </div>
            )}

            {semFerias.length > 0 && (
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10">
                <button onClick={() => setAlertFeriasOpen(!alertFeriasOpen)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Palmtree className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                      ⚠ Férias não atualizadas — {semFerias.length} servidor{semFerias.length > 1 ? "es" : ""}
                    </span>
                  </div>
                  {alertFeriasOpen ? <ChevronDown className="h-4 w-4 text-orange-600" /> : <ChevronRight className="h-4 w-4 text-orange-600" />}
                </button>
                {alertFeriasOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {semFerias.slice(0, 15).map(s => (
                      <span key={s.id} className="text-[11px] bg-orange-500/15 text-orange-800 dark:text-orange-200 rounded-md px-2 py-0.5">{s.nome}</span>
                    ))}
                    {semFerias.length > 15 && <span className="text-[10px] text-orange-600/60 self-center">+{semFerias.length - 15} mais</span>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Unidades de {currentDiretoria?.nome}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allowedUnidades.filter(u => u.diretoria_id === selectedDiretoriaId).map(uni => (
                  <UnitSummaryCard key={uni.id} uni={uni} />
                ))}
              </div>
            </div>

            {/* Alocar Servidores em Massa - Diretoria */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5" /> Alocar Servidores nesta Diretoria
                </h3>
                <button onClick={() => { setShowBulkAlloc(!showBulkAlloc); setAllocSelectedIds(new Set()); setAllocSearch(""); }}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                  {showBulkAlloc ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {showBulkAlloc ? "Fechar" : "Alocar em Massa"}
                </button>
              </div>
              {showBulkAlloc && (
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground">Buscar servidor</label>
                      <input value={allocSearch} onChange={e => setAllocSearch(e.target.value)} placeholder="Digite o nome..."
                        className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Unidade (opcional)</label>
                      <select value={allocTargetUnidade} onChange={e => setAllocTargetUnidade(e.target.value)}
                        className="h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none">
                        <option value="">Só diretoria</option>
                        {unidades.filter(u => u.diretoria_id === selectedDiretoriaId).map(u => (
                          <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-bold text-primary">{allocSelectedIds.size} selecionado(s)</span>
                    <button onClick={() => setAllocSelectedIds(new Set(allocAvailableServidores.map(s => s.id)))} className="text-primary hover:underline">Selecionar todos</button>
                    <button onClick={() => setAllocSelectedIds(new Set())} className="text-muted-foreground hover:underline">Limpar</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded border border-border bg-muted/10">
                    {allocAvailableServidores.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary/5 cursor-pointer border-b border-border/10 last:border-0">
                        <input type="checkbox" checked={allocSelectedIds.has(s.id)}
                          onChange={() => setAllocSelectedIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                          className="h-3.5 w-3.5 rounded border-input" />
                        <span className="text-xs text-foreground">{s.nome}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{s.cargo}</span>
                        {s.diretoria_id && <span className="text-[9px] bg-muted px-1 rounded text-muted-foreground">{diretorias.find(d => d.id === s.diretoria_id)?.nome?.slice(0, 15) || "Outra dir."}</span>}
                      </label>
                    ))}
                    {allocAvailableServidores.length === 0 && <p className="text-xs text-muted-foreground p-3 italic">Nenhum servidor encontrado.</p>}
                  </div>
                  <button onClick={bulkAllocate} disabled={savingAlloc || allocSelectedIds.size === 0}
                    className="flex items-center gap-1 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                    {savingAlloc ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                    Alocar {allocSelectedIds.size} servidor(es)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ UNIDADE VIEW (detail) ═══ */}
        {selectedUnidadeId && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
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
              <div className="rounded-xl border border-info/30 bg-info/5 p-4">
                <div className="flex items-center gap-2 text-xs text-info mb-1"><FileText className="h-3.5 w-3.5" /> Atestados</div>
                <p className="text-2xl font-bold text-info">{activeAtestados.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ativos hoje</p>
              </div>
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 mb-1"><CalendarCheck className="h-3.5 w-3.5" /> Abonadas</div>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{activeFaltasAbonadas.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">no ciclo atual</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Carga</div>
                <p className="text-2xl font-bold text-foreground">{totalHoras}h</p>
              </div>
              <PayrollCard servs={filteredServidores} label="Folha Unidade" />
            </div>

            {/* Conflitos de datas */}
            {conflictsData.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                    ⚠ Conflitos de Datas — {conflictsData.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {conflictsData.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                      <span className="text-[10px] font-bold text-destructive whitespace-nowrap mt-0.5">{c.tipo}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{c.servidor.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{c.detalhe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {semEscala.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10">
                <button onClick={() => setAlertEscalaOpen(!alertEscalaOpen)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      ⚠ Sem escala — {semEscala.length} servidor{semEscala.length > 1 ? "es" : ""}
                    </span>
                  </div>
                  {alertEscalaOpen ? <ChevronDown className="h-4 w-4 text-amber-600" /> : <ChevronRight className="h-4 w-4 text-amber-600" />}
                </button>
                {alertEscalaOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {semEscala.slice(0, 15).map(s => (
                      <span key={s.id} className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-200 rounded-md px-2 py-0.5">{s.nome}</span>
                    ))}
                    {semEscala.length > 15 && <span className="text-[10px] text-amber-600/60 self-center">+{semEscala.length - 15} mais</span>}
                  </div>
                )}
              </div>
            )}

            {semFerias.length > 0 && (
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10">
                <button onClick={() => setAlertFeriasOpen(!alertFeriasOpen)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Palmtree className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                      ⚠ Férias não atualizadas — {semFerias.length} servidor{semFerias.length > 1 ? "es" : ""}
                    </span>
                  </div>
                  {alertFeriasOpen ? <ChevronDown className="h-4 w-4 text-orange-600" /> : <ChevronRight className="h-4 w-4 text-orange-600" />}
                </button>
                {alertFeriasOpen && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {semFerias.slice(0, 15).map(s => (
                      <span key={s.id} className="text-[11px] bg-orange-500/15 text-orange-800 dark:text-orange-200 rounded-md px-2 py-0.5">{s.nome}</span>
                    ))}
                    {semFerias.length > 15 && <span className="text-[10px] text-orange-600/60 self-center">+{semFerias.length - 15} mais</span>}
                  </div>
                )}
              </div>
            )}

            {/* Alocar Servidores em Massa - Unidade */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5" /> Alocar Servidores nesta Unidade
                </h3>
                <button onClick={() => { setShowBulkAlloc(!showBulkAlloc); setAllocSelectedIds(new Set()); setAllocSearch(""); }}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                  {showBulkAlloc ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {showBulkAlloc ? "Fechar" : "Alocar em Massa"}
                </button>
              </div>
              {showBulkAlloc && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Buscar servidor</label>
                    <input value={allocSearch} onChange={e => setAllocSearch(e.target.value)} placeholder="Digite o nome..."
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-bold text-primary">{allocSelectedIds.size} selecionado(s)</span>
                    <button onClick={() => setAllocSelectedIds(new Set(allocAvailableServidores.map(s => s.id)))} className="text-primary hover:underline">Selecionar todos</button>
                    <button onClick={() => setAllocSelectedIds(new Set())} className="text-muted-foreground hover:underline">Limpar</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded border border-border bg-muted/10">
                    {allocAvailableServidores.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary/5 cursor-pointer border-b border-border/10 last:border-0">
                        <input type="checkbox" checked={allocSelectedIds.has(s.id)}
                          onChange={() => setAllocSelectedIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                          className="h-3.5 w-3.5 rounded border-input" />
                        <span className="text-xs text-foreground">{s.nome}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{s.cargo}</span>
                        {s.unidade_id && <span className="text-[9px] bg-muted px-1 rounded text-muted-foreground">{unidades.find(u => u.id === s.unidade_id)?.sigla || "Outra"}</span>}
                      </label>
                    ))}
                    {allocAvailableServidores.length === 0 && <p className="text-xs text-muted-foreground p-3 italic">Nenhum servidor encontrado.</p>}
                  </div>
                  <button onClick={bulkAllocate} disabled={savingAlloc || allocSelectedIds.size === 0}
                    className="flex items-center gap-1 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                    {savingAlloc ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                    Alocar {allocSelectedIds.size} servidor(es)
                  </button>
                </div>
              )}
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
                        {getShiftLabel(s)}
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
                        {getShiftLabel(s)}
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
            </div>

            {/* Gestão de Férias em Massa */}
            <div className="rounded-xl border border-warning/30 bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-warning flex items-center gap-2">
                  <Palmtree className="h-3.5 w-3.5" /> Gestão de Férias — {currentUnidade?.sigla || "Unidade"}
                </h3>
                {canEditEscalasFerias && (
                  !showBulkFerias ? (
                    <button onClick={initBulkFerias} className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                      <Pencil className="h-3.5 w-3.5" /> Editar Férias em Massa
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={saveBulkFerias} disabled={savingBulkFerias} className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                        {savingBulkFerias ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar Todos
                      </button>
                      <button onClick={() => setShowBulkFerias(false)} className="text-xs text-muted-foreground">Cancelar</button>
                    </div>
                  )
                )}
              </div>
              <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Servidor</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Período 1</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Período 2</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Dias</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Vencidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServidores.map(s => {
                      const f = showBulkFerias ? bulkFerias[s.id] : null;
                      const iClass = "h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground focus:ring-1 focus:ring-ring focus:outline-none";
                      return (
                        <tr key={s.id} className="border-b border-border/20 hover:bg-muted/10">
                          <td className="py-1.5 font-medium text-foreground whitespace-nowrap pr-2">{s.nome}</td>
                          {showBulkFerias && f ? (
                            <>
                              <td className="py-1">
                                <select value={f.status} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: e.target.value } }))}
                                  className={cn(iClass, "w-28")}>
                                  <option value="">—</option>
                                  <option value="PROGRAMADAS">Programadas</option>
                                  <option value="EM GOZO">Em Gozo</option>
                                  <option value="GOZADAS">Gozadas</option>
                                  <option value="PENDENTES">Pendentes</option>
                                  <option value="SEM ANO DE REFERÊNCIA">Sem Ref.</option>
                                </select>
                              </td>
                              <td className="py-1">
                                <div className="flex gap-1">
                                  <input type="date" className={cn(iClass, "w-[115px]")} value={f.p1_inicio} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], p1_inicio: e.target.value } }))} />
                                  <input type="date" className={cn(iClass, "w-[115px]")} value={f.p1_fim} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], p1_fim: e.target.value } }))} />
                                </div>
                              </td>
                              <td className="py-1">
                                <div className="flex gap-1">
                                  <input type="date" className={cn(iClass, "w-[115px]")} value={f.p2_inicio} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], p2_inicio: e.target.value } }))} />
                                  <input type="date" className={cn(iClass, "w-[115px]")} value={f.p2_fim} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], p2_fim: e.target.value } }))} />
                                </div>
                              </td>
                              <td className="py-1"><input type="number" className={cn(iClass, "w-12 text-center")} value={f.total_dias} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], total_dias: e.target.value } }))} /></td>
                              <td className="py-1"><input type="number" className={cn(iClass, "w-12 text-center")} value={f.vencidas} onChange={e => setBulkFerias(prev => ({ ...prev, [s.id]: { ...prev[s.id], vencidas: e.target.value } }))} /></td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5">
                                <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                                  s.ferias_status_gerencial === "EM GOZO" ? "bg-warning/20 text-warning" :
                                  s.ferias_status_gerencial === "PROGRAMADAS" ? "bg-primary/10 text-primary" :
                                  s.ferias_status_gerencial === "GOZADAS" ? "bg-success/10 text-success" :
                                  s.ferias_status_gerencial === "PENDENTES" ? "bg-destructive/10 text-destructive" :
                                  "bg-muted text-muted-foreground"
                                )}>{s.ferias_status_gerencial || "—"}</span>
                              </td>
                              <td className="py-1.5 font-mono text-muted-foreground text-[10px]">
                                {s.ferias_periodo1_inicio ? `${s.ferias_periodo1_inicio} → ${s.ferias_periodo1_fim || "?"}` : "—"}
                              </td>
                              <td className="py-1.5 font-mono text-muted-foreground text-[10px]">
                                {s.ferias_periodo2_inicio ? `${s.ferias_periodo2_inicio} → ${s.ferias_periodo2_fim || "?"}` : "—"}
                              </td>
                              <td className="py-1.5 font-mono text-foreground font-bold">{s.ferias_total_dias || "—"}</td>
                              <td className="py-1.5">
                                <span className={cn("font-mono font-bold", (s.ferias_vencidas || 0) > 0 ? "text-destructive" : "text-muted-foreground")}>
                                  {s.ferias_vencidas || 0}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* Afastamentos */}
            <div className="rounded-xl border border-orange-500/30 bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <UserX className="h-3.5 w-3.5" /> Afastamentos Ativos ({activeAfastamentos.length})
                </h3>
                <button onClick={() => setShowAfastamentoForm(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80">
                  <Plus className="h-3.5 w-3.5" /> Registrar
                </button>
              </div>
              {showAfastamentoForm && (
                <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="space-y-1">
                    <input value={afastamentoSearch} onChange={e => setAfastamentoSearch(e.target.value)} placeholder="Buscar servidor..."
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                    {!afastamentoForm.servidor_id && (
                      <div className="max-h-28 overflow-y-auto bg-card rounded border border-border shadow-md">
                        {filteredAfastamentoServidores.map(s => (
                          <button key={s.id} onClick={() => { setAfastamentoForm(f => ({ ...f, servidor_id: s.id })); setAfastamentoSearch(s.nome); }}
                            className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">{s.nome} <span className="text-muted-foreground">({s.cargo})</span></button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div><label className="text-[10px] text-muted-foreground">Motivo</label>
                    <select value={afastamentoForm.motivo} onChange={e => setAfastamentoForm(f => ({ ...f, motivo: e.target.value }))}
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none">
                      {MOTIVOS_AFASTAMENTO.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-muted-foreground">Data Início</label>
                      <input type="date" value={afastamentoForm.data_inicio} onChange={e => setAfastamentoForm(f => ({ ...f, data_inicio: e.target.value }))}
                        className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                    <div><label className="text-[10px] text-muted-foreground">Previsão Retorno (opcional)</label>
                      <input type="date" value={afastamentoForm.data_fim} onChange={e => setAfastamentoForm(f => ({ ...f, data_fim: e.target.value }))}
                        className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none" /></div>
                  </div>
                  <input value={afastamentoForm.observacao} onChange={e => setAfastamentoForm(f => ({ ...f, observacao: e.target.value }))}
                    placeholder="Observação (opcional)" className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={addAfastamento} className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Salvar</button>
                    <button onClick={() => { setShowAfastamentoForm(false); setAfastamentoSearch(""); setAfastamentoForm({ servidor_id: "", motivo: "Licença para Tratamento de Saúde", data_inicio: "", data_fim: "", observacao: "" }); }}
                      className="text-xs text-muted-foreground">Cancelar</button>
                  </div>
                </div>
              )}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {activeAfastamentos.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum afastamento ativo.</p>}
                {activeAfastamentos.map(a => {
                  const diasAfastado = differenceInDays(today, parseISO(a.data_inicio));
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-orange-500/5 border border-orange-500/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getServidorNome(a.servidor_id)}</p>
                        <p className="text-[10px] text-muted-foreground">{a.motivo}{a.observacao ? ` · ${a.observacao}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-xs font-mono text-orange-600 dark:text-orange-400">{diasAfastado} dia(s)</span>
                          <p className="text-[10px] text-muted-foreground">
                            {a.data_fim ? `Retorno: ${format(parseISO(a.data_fim), "dd/MM/yyyy")}` : "Sem previsão"}
                          </p>
                        </div>
                        <button onClick={() => finalizarAfastamento(a.id, a.servidor_id)}
                          title="Finalizar afastamento"
                          className="h-6 px-2 rounded text-[10px] font-medium bg-success/10 text-success hover:bg-success/20">
                          Retornou
                        </button>
                      </div>
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
                      const fFolha = fServs.reduce((sum, s) => sum + (s.salario || 0), 0);
                      return (
                        <div key={f.id} className="rounded-lg border border-border/50 p-3">
                          <h4 className="text-sm font-bold text-foreground mb-2">{f.nome}</h4>
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            <span className="text-muted-foreground">{fServs.length} total</span>
                            <span className="text-success font-medium">{fPresentes} presentes</span>
                            {hasFinancialAccess && fFolha > 0 && <span className="text-primary font-mono font-medium">{formatCurrency(fFolha)}</span>}
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
                {canEditEscalasFerias && (
                  !showBulkEscala ? (
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
                  )
                )}
              </div>
              <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Servidor</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Cargo</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Admissão</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Turno 1</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Turno 2</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Total</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Escala</th>
                      {hasFinancialAccess && <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Salário</th>}
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">F.Abon.</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap w-10">Sem.</th>
                      {canTransfer && <th className="pb-2 font-semibold text-muted-foreground whitespace-nowrap w-8"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServidores.map(s => {
                      const faltaInfo = getFaltasNoAno(s.id, s.data_admissao);
                      return (
                        <React.Fragment key={s.id}>
                          <tr className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-2 font-medium text-foreground">{s.nome}</td>
                            <td className="py-2 text-muted-foreground">{s.cargo}</td>
                            <td className="py-2 text-muted-foreground font-mono">{s.data_admissao ? format(parseISO(s.data_admissao), "dd/MM/yyyy") : "—"}</td>
                            {showBulkEscala && bulkEscalas[s.id] ? (
                              <>
                                <td className="py-1">
                                  <div className="flex gap-1">
                                    <input type="time" value={bulkEscalas[s.id].inicio1} onChange={e => updateBulkEscalaTime(s.id, "inicio1", e.target.value)}
                                      className="w-20 h-6 rounded border border-input bg-card px-1 text-[10px] text-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
                                    <input type="time" value={bulkEscalas[s.id].fim1} onChange={e => updateBulkEscalaTime(s.id, "fim1", e.target.value)}
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
                            <td className="py-2">
                              <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap",
                                s.tipo_escala?.includes("plantao") ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-muted text-muted-foreground"
                              )}>
                                {s.tipo_escala === "plantao_12x36" ? "12×36" : s.tipo_escala === "plantao_24x72" ? "24×72" : s.tipo_escala === "plantao_12x60" ? "12×60" : s.tipo_escala === "variavel" ? "Var." : "Fixa"}
                              </span>
                            </td>
                            {hasFinancialAccess && <td className="py-2 font-mono text-primary whitespace-nowrap">{s.salario > 0 ? formatCurrency(s.salario) : "—"}</td>}
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
                            <td className="py-2">
                              <button
                                onClick={() => setExpandedSemanalId(expandedSemanalId === s.id ? null : s.id)}
                                className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", expandedSemanalId === s.id ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10")}
                                title="Escala semanal"
                              >
                                <Calendar className="h-3 w-3" />
                              </button>
                            </td>
                            {canTransfer && (
                              <td className="py-2">
                                <button
                                  onClick={() => setTransferServidor(s)}
                                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                  title="Transferir para outra diretoria"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                          {expandedSemanalId === s.id && (
                            <tr>
                              <td colSpan={10} className="p-2 bg-muted/10">
                                <EscalaSemanalEditor
                                  servidorId={s.id}
                                  servidorNome={s.nome}
                                  tipoEscala={s.tipo_escala}
                                  defaultEscala={{ inicio1: s.escala_inicio1 || "", fim1: s.escala_fim1 || "", inicio2: s.escala_inicio2 || "", fim2: s.escala_fim2 || "", total: s.escala_total_horas }}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <TransferServidorModal
        servidor={transferServidor}
        open={!!transferServidor}
        onClose={() => setTransferServidor(null)}
        onSent={() => loadData()}
        diretorias={diretorias}
        currentDiretoriaId={selectedDiretoriaId || userDiretoriaId || ""}
        userId={user?.id || ""}
      />
    </div>
  );
}

export default function MonitorUnidade() {
  return <MonitorContent />;
}
