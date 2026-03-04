import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthSession } from "@/hooks/useAuthSession";
import { LoginForm } from "@/components/LoginForm";
import { supabase } from "@/integrations/supabase/client";
import type { DiretoriaDB, UnidadeDB, CoordenacaoDB, ServidorDB, SetorDB, FuncaoDB, CoordenadorUnidadeDB, AgrupamentoDB } from "@/hooks/useServidores";
import {
  Building2, Plus, Trash2, Edit2, ChevronDown, ChevronRight, ArrowLeft, Loader2, Shield, X, Check, Network, Users, UserPlus, Crown, Star, Briefcase, Eye, Layers, Stethoscope
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { CreateServidorModal } from "@/components/CreateServidorModal";
import { UnidadeServidores } from "@/components/UnidadeServidores";
import { EditServidorModal } from "@/components/EditServidorModal";
import { SetorList } from "@/components/SetorList";
import { FuncaoList } from "@/components/FuncaoList";
import { EquipeSaudeList } from "@/components/EquipeSaudeList";
import { Checkbox } from "@/components/ui/checkbox";
import { ServidorConflictBadge, ServidorAlreadyAllocatedWarning } from "@/components/ServidorConflictBadge";

function EstruturaContent() {
  const { toast } = useToast();
  const { isAdmin, isDiretor, isCoordenador, isCoordenadorGeral, diretoriaIds: userDirIds, unidadeIds: userUniIds, loading: authLoading } = useAuthSession();
  const [allDiretorias, setAllDiretorias] = useState<DiretoriaDB[]>([]);
  const [allUnidades, setAllUnidades] = useState<UnidadeDB[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<CoordenacaoDB[]>([]);
  const [allServidores, setAllServidores] = useState<ServidorDB[]>([]);
  const [setores, setSetores] = useState<SetorDB[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoDB[]>([]);
  const [coordenadoresUnidades, setCoordenadoresUnidades] = useState<CoordenadorUnidadeDB[]>([]);
  const [agrupamentos, setAgrupamentos] = useState<AgrupamentoDB[]>([]);
  const [servidoresUnidades, setServidoresUnidades] = useState<{ servidor_id: string; unidade_id: string }[]>([]);
  const [servidoresSetores, setServidoresSetores] = useState<{ servidor_id: string; setor_id: string }[]>([]);
  const [equipesSaude, setEquipesSaude] = useState<{ id: string; nome: string; tipo: string; unidade_id: string; responsavel_id: string | null }[]>([]);
  const [servidoresEquipes, setServidoresEquipes] = useState<{ servidor_id: string; equipe_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Form states
  const [newDiretoria, setNewDiretoria] = useState("");
  const [newUnidade, setNewUnidade] = useState<{ nome: string; sigla: string; diretoria_id: string } | null>(null);
  const [newCoord, setNewCoord] = useState<{ nome: string; unidade_id: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [createServidorTarget, setCreateServidorTarget] = useState<{ diretoria_id?: string; unidade_id?: string; coordenacao_id?: string } | null>(null);
  const [assigningTo, setAssigningTo] = useState<{ type: "unidade" | "coordenacao"; id: string; diretoria_id: string } | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [pickingRole, setPickingRole] = useState<{ type: "diretor" | "coordenador" | "coordenador_medico" | "secretario" | "diretor_geral"; targetId: string; diretoriaId?: string; unidadeId?: string } | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [editingServidor, setEditingServidor] = useState<ServidorDB | null>(null);
  const [assigningSecretaria, setAssigningSecretaria] = useState(false);
  const [secAssignSearch, setSecAssignSearch] = useState("");
  const [secSelectedIds, setSecSelectedIds] = useState<Set<string>>(new Set());
  const [newSetor, setNewSetor] = useState<{ nome: string; cargo_gestao: string; diretoria_id: string | null } | null>(null);
  const [assigningSetor, setAssigningSetor] = useState<{ setor_id: string } | null>(null);
  const [setorAssignSearch, setSetorAssignSearch] = useState("");
  const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
  // Alocar para diretoria
  const [alocandoDiretoria, setAlocandoDiretoria] = useState(false);
  const [alocDirSearch, setAlocDirSearch] = useState("");
  const [alocDirSelectedIds, setAlocDirSelectedIds] = useState<Set<string>>(new Set());
  const [alocDirTargetId, setAlocDirTargetId] = useState<string>("");
  const [newAgrupamento, setNewAgrupamento] = useState<{ nome: string; diretoria_id: string } | null>(null);
  const [pickingAgrupCoord, setPickingAgrupCoord] = useState<string | null>(null);
  const [agrupCoordSearch, setAgrupCoordSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [d, u, c, st, fc, cu, ag, su, ss, eq, se] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("coordenacoes").select("*").order("nome"),
      supabase.from("setores").select("*").order("nome"),
      supabase.from("funcoes").select("*").order("nome"),
      supabase.from("coordenadores_unidades").select("*"),
      supabase.from("agrupamentos").select("*").order("nome"),
      supabase.from("servidores_unidades").select("servidor_id, unidade_id"),
      supabase.from("servidores_setores").select("servidor_id, setor_id"),
      supabase.from("equipes_saude").select("id, nome, tipo, unidade_id, responsavel_id").order("nome"),
      supabase.from("servidores_equipes").select("servidor_id, equipe_id"),
    ]);
    // Fetch all servidores with pagination (bypass 1000 limit)
    const selectCols = "id, nome, matricula, cargo, diretoria_id, unidade_id, coordenacao_id, setor_id, funcao_id, is_diretor, is_coordenador, is_coordenador_medico, is_secretario, is_diretor_geral, escala_inicio1, escala_fim1, escala_inicio2, escala_fim2, escala_total_horas, vinculo";
    const PAGE = 1000;
    let offset = 0;
    let allServidores: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("servidores")
        .select(selectCols)
        .order("nome")
        .range(offset, offset + PAGE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      allServidores = allServidores.concat(data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    setAllDiretorias((d.data ?? []) as DiretoriaDB[]);
    setAllUnidades((u.data ?? []) as UnidadeDB[]);
    setCoordenacoes((c.data ?? []) as CoordenacaoDB[]);
    setSetores((st.data ?? []) as SetorDB[]);
    setFuncoes((fc.data ?? []) as FuncaoDB[]);
    setCoordenadoresUnidades((cu.data ?? []) as CoordenadorUnidadeDB[]);
    setAgrupamentos((ag.data ?? []) as AgrupamentoDB[]);
    setServidoresUnidades((su.data ?? []) as { servidor_id: string; unidade_id: string }[]);
    setServidoresSetores((ss.data ?? []) as { servidor_id: string; setor_id: string }[]);
    setEquipesSaude((eq.data ?? []) as { id: string; nome: string; tipo: string; unidade_id: string; responsavel_id: string | null }[]);
    setServidoresEquipes((se.data ?? []) as { servidor_id: string; equipe_id: string }[]);
    setAllServidores(allServidores as ServidorDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter data based on user role
  const diretorias = useMemo(() => {
    if (isAdmin) return allDiretorias;
    if (isDiretor && userDirIds.length > 0) return allDiretorias.filter(d => userDirIds.includes(d.id));
    if (isCoordenador && userUniIds.length > 0) {
      const dirIds = allUnidades.filter(u => userUniIds.includes(u.id)).map(u => u.diretoria_id);
      return allDiretorias.filter(d => dirIds.includes(d.id));
    }
    return [];
  }, [allDiretorias, allUnidades, isAdmin, isDiretor, isCoordenador, userDirIds, userUniIds]);

  const unidades = useMemo(() => {
    if (isAdmin) return allUnidades;
    if (isDiretor && userDirIds.length > 0) return allUnidades.filter(u => userDirIds.includes(u.diretoria_id));
    if (isCoordenador && userUniIds.length > 0) return allUnidades.filter(u => userUniIds.includes(u.id));
    return [];
  }, [allUnidades, isAdmin, isDiretor, isCoordenador, userDirIds, userUniIds]);

  // Todos os servidores ficam disponíveis para alocação, independente do papel do usuário
  const servidores = allServidores;

  // Helper: can the current user manage (create/edit/delete) structure items?
  const canManageStructure = isAdmin;
  // Directors/coord geral can manage within their diretorias
  const canManageDiretoria = (dirId: string) => isAdmin || (isDiretor && userDirIds.includes(dirId));
  const canManageUnidade = (uniId: string) => isAdmin || (isDiretor && allUnidades.some(u => u.id === uniId && userDirIds.includes(u.diretoria_id))) || (isCoordenador && userUniIds.includes(uniId));

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // CRUD Diretorias
  const addDiretoria = async () => {
    if (!newDiretoria.trim()) return;
    const { error } = await supabase.from("diretorias").insert({ nome: newDiretoria.trim() });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewDiretoria("");
    toast({ title: "Diretoria criada!" });
    loadData();
  };

  const deleteDiretoria = async (id: string) => {
    const hasUnidades = unidades.some(u => u.diretoria_id === id);
    if (hasUnidades) { toast({ title: "Erro", description: "Remova as unidades antes de excluir a diretoria.", variant: "destructive" }); return; }
    await supabase.from("diretorias").delete().eq("id", id);
    toast({ title: "Diretoria removida" });
    loadData();
  };

  // CRUD Unidades
  const addUnidade = async () => {
    if (!newUnidade || !newUnidade.nome.trim() || !newUnidade.sigla.trim()) return;
    const { error } = await supabase.from("unidades").insert({
      nome: newUnidade.nome.trim(),
      sigla: newUnidade.sigla.trim().toUpperCase(),
      diretoria_id: newUnidade.diretoria_id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewUnidade(null);
    toast({ title: "Unidade criada!" });
    loadData();
  };

  const deleteUnidade = async (id: string) => {
    const hasCoords = coordenacoes.some(c => c.unidade_id === id);
    if (hasCoords) { toast({ title: "Erro", description: "Remova as coordenações antes.", variant: "destructive" }); return; }
    await supabase.from("unidades").delete().eq("id", id);
    toast({ title: "Unidade removida" });
    loadData();
  };

  // CRUD Coordenações
  const addCoord = async () => {
    if (!newCoord || !newCoord.nome.trim()) return;
    const { error } = await supabase.from("coordenacoes").insert({
      nome: newCoord.nome.trim(),
      unidade_id: newCoord.unidade_id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewCoord(null);
    toast({ title: "Coordenação criada!" });
    loadData();
  };

  // Assign servidor to unidade/coordenação
  const assignServidoresToUnidade = async (servidorIds: string[], diretoriaId: string, unidadeId: string) => {
    if (servidorIds.length === 0) return false;

    const selected = servidores.filter(s => servidorIds.includes(s.id));
    const hasExtraUnidade = (servidorId: string) => servidoresUnidades.some(su => su.servidor_id === servidorId);

    const semVinculo = selected
      .filter(s => !s.unidade_id && !hasExtraUnidade(s.id))
      .map(s => s.id);

    const jaNaUnidade = new Set(
      selected
        .filter(
          s =>
            s.unidade_id === unidadeId ||
            servidoresUnidades.some(su => su.servidor_id === s.id && su.unidade_id === unidadeId)
        )
        .map(s => s.id)
    );

    const manterEmAmbas = selected
      .filter(s => !jaNaUnidade.has(s.id) && (Boolean(s.unidade_id) || hasExtraUnidade(s.id)))
      .map(s => s.id);

    if (semVinculo.length > 0) {
      const { error } = await supabase
        .from("servidores")
        .update({ diretoria_id: diretoriaId, unidade_id: unidadeId })
        .in("id", semVinculo);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return false;
      }
    }

    if (manterEmAmbas.length > 0) {
      const { data: existentes, error: consultaErro } = await supabase
        .from("servidores_unidades")
        .select("servidor_id")
        .eq("unidade_id", unidadeId)
        .in("servidor_id", manterEmAmbas);

      if (consultaErro) {
        toast({ title: "Erro", description: consultaErro.message, variant: "destructive" });
        return false;
      }

      const existentesSet = new Set((existentes ?? []).map(row => row.servidor_id));
      const payload = manterEmAmbas
        .filter(servidorId => !existentesSet.has(servidorId))
        .map(servidor_id => ({ servidor_id, unidade_id: unidadeId }));

      if (payload.length > 0) {
        const { error } = await supabase.from("servidores_unidades").insert(payload);
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
          return false;
        }
      }
    }

    const totalNovos = semVinculo.length + manterEmAmbas.length;

    if (totalNovos === 0) {
      toast({ title: "Nenhuma alteração", description: "Os servidores selecionados já estavam vinculados a esta unidade." });
      return true;
    }

    toast({
      title: `${totalNovos} servidor(es) vinculado(s)!`,
      description: manterEmAmbas.length > 0
        ? `${manterEmAmbas.length} mantido(s) em múltiplas unidades.`
        : undefined,
    });

    return true;
  };

  const assignServidor = async (servidorId: string, diretoriaId: string, unidadeId: string, coordenacaoId?: string) => {
    const ok = await assignServidoresToUnidade([servidorId], diretoriaId, unidadeId);
    if (!ok) return;

    if (coordenacaoId) {
      const { error } = await supabase.from("servidores").update({ coordenacao_id: coordenacaoId }).eq("id", servidorId);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
    }

    setAssigningTo(null);
    setAssignSearch("");
    loadData();
  };

  // CRUD Setores
  const addSetor = async () => {
    if (!newSetor || !newSetor.nome.trim()) return;
    const { error } = await supabase.from("setores").insert({
      nome: newSetor.nome.trim(),
      cargo_gestao: newSetor.cargo_gestao.trim() || null,
      diretoria_id: newSetor.diretoria_id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewSetor(null);
    toast({ title: "Setor/Função criado!" });
    loadData();
  };

  const deleteSetor = async (id: string) => {
    await supabase.from("servidores").update({ setor_id: null }).eq("setor_id", id);
    await supabase.from("setores").delete().eq("id", id);
    toast({ title: "Setor removido" });
    loadData();
  };

  const assignServidorToSetor = async (servidorId: string, setorId: string, diretoriaId: string | null) => {
    const servidor = servidores.find(s => s.id === servidorId);
    if (!servidor) return;

    const setorIdsAtuais = new Set<string>();
    if (servidor.setor_id) setorIdsAtuais.add(servidor.setor_id);
    servidoresSetores
      .filter(ss => ss.servidor_id === servidorId)
      .forEach(ss => setorIdsAtuais.add(ss.setor_id));

    if (setorIdsAtuais.has(setorId)) {
      toast({ title: "Servidor já vinculado a este setor." });
      return;
    }

    if (setorIdsAtuais.size > 0) {
      await keepInBothSetores(servidorId, setorId);
      return;
    }

    const updateData: any = { setor_id: setorId };
    if (diretoriaId) updateData.diretoria_id = diretoriaId;

    const { error } = await supabase.from("servidores").update(updateData).eq("id", servidorId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Servidor vinculado ao setor!" });
    setAssigningSetor(null);
    setSetorAssignSearch("");
    loadData();
  };

  const bulkAssignServidorToSetor = async (servidorIds: string[], setorId: string, diretoriaId: string | null) => {
    if (servidorIds.length === 0) return;

    const semSetorAtual: string[] = [];
    const manterEmAmbos: string[] = [];

    servidorIds.forEach(servidorId => {
      const servidor = servidores.find(s => s.id === servidorId);
      if (!servidor) return;

      const setorIdsAtuais = new Set<string>();
      if (servidor.setor_id) setorIdsAtuais.add(servidor.setor_id);
      servidoresSetores
        .filter(ss => ss.servidor_id === servidorId)
        .forEach(ss => setorIdsAtuais.add(ss.setor_id));

      if (setorIdsAtuais.has(setorId)) return;
      if (setorIdsAtuais.size > 0) {
        manterEmAmbos.push(servidorId);
      } else {
        semSetorAtual.push(servidorId);
      }
    });

    if (semSetorAtual.length > 0) {
      const updateData: any = { setor_id: setorId };
      if (diretoriaId) updateData.diretoria_id = diretoriaId;

      const { error } = await supabase.from("servidores").update(updateData).in("id", semSetorAtual);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
    }

    let extrasInseridos = 0;

    if (manterEmAmbos.length > 0) {
      const { data: existentes, error: consultaErro } = await supabase
        .from("servidores_setores")
        .select("servidor_id")
        .eq("setor_id", setorId)
        .in("servidor_id", manterEmAmbos);

      if (consultaErro) {
        toast({ title: "Erro", description: consultaErro.message, variant: "destructive" });
        return;
      }

      const existentesSet = new Set((existentes ?? []).map(row => row.servidor_id));
      const payload = manterEmAmbos
        .filter(servidorId => !existentesSet.has(servidorId))
        .map(servidor_id => ({ servidor_id, setor_id: setorId }));

      extrasInseridos = payload.length;

      if (payload.length > 0) {
        const { error } = await supabase.from("servidores_setores").insert(payload);
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
          return;
        }
      }
    }

    const totalNovos = semSetorAtual.length + extrasInseridos;

    if (totalNovos === 0) {
      toast({ title: "Nenhuma alteração", description: "Os servidores selecionados já estavam neste setor." });
      return;
    }

    toast({
      title: `${totalNovos} servidor(es) vinculado(s) ao setor!`,
      description: extrasInseridos > 0 ? `${extrasInseridos} mantido(s) em múltiplos setores.` : undefined,
    });

    loadData();
  };

  const keepInBothSetores = async (servidorId: string, newSetorId: string) => {
    const { data: existente, error: consultaErro } = await supabase
      .from("servidores_setores")
      .select("id")
      .eq("servidor_id", servidorId)
      .eq("setor_id", newSetorId)
      .limit(1);

    if (consultaErro) {
      toast({ title: "Erro", description: consultaErro.message, variant: "destructive" });
      return;
    }

    if (existente && existente.length > 0) {
      toast({ title: "Servidor já vinculado a este setor." });
      return;
    }

    const { error } = await supabase.from("servidores_setores").insert({ servidor_id: servidorId, setor_id: newSetorId });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Servidor mantido em ambos os setores!" });
    loadData();
  };

  const bulkKeepInBothSetores = async (servidorIds: string[], newSetorId: string) => {
    if (servidorIds.length === 0) return;

    const { data: existentes, error: consultaErro } = await supabase
      .from("servidores_setores")
      .select("servidor_id")
      .eq("setor_id", newSetorId)
      .in("servidor_id", servidorIds);

    if (consultaErro) {
      toast({ title: "Erro", description: consultaErro.message, variant: "destructive" });
      return;
    }

    const existentesSet = new Set((existentes ?? []).map(row => row.servidor_id));
    const payload = servidorIds
      .filter(servidorId => !existentesSet.has(servidorId))
      .map(servidor_id => ({ servidor_id, setor_id: newSetorId }));

    if (payload.length === 0) {
      toast({ title: "Nenhuma alteração", description: "Os servidores selecionados já estavam neste setor." });
      return;
    }

    const { error } = await supabase.from("servidores_setores").insert(payload);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: `${payload.length} servidor(es) mantido(s) em múltiplos setores!`,
      description: payload.length < servidorIds.length ? `${servidorIds.length - payload.length} já estavam vinculados.` : undefined,
    });
    loadData();
  };

  const setResponsavelSetor = async (setorId: string, servidorId: string) => {
    const { error } = await supabase.from("setores").update({ responsavel_id: servidorId }).eq("id", setorId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Responsável definido!" });
    setPickingRole(null);
    setRoleSearch("");
    loadData();
  };

  const getSetoresByDiretoria = (diretoriaId: string | null) => setores.filter(s => s.diretoria_id === diretoriaId);
  const getFuncoesByUnidade = (unidadeId: string) => funcoes.filter(f => f.unidade_id === unidadeId);
  const getServidoresBySetor = (setorId: string) => servidores.filter(s => (s as any).setor_id === setorId);
  const getResponsavel = (responsavelId: string | null) => responsavelId ? servidores.find(s => s.id === responsavelId) : null;

  const unassignedServidores = servidores.filter(s => !s.unidade_id);
  const secretariaServidores = servidores.filter(s => !s.diretoria_id && !s.unidade_id);
  const getServidoresByUnidade = (unidadeId: string) => {
    const primaryIds = servidores.filter(s => s.unidade_id === unidadeId).map(s => s.id);
    const extraIds = servidoresUnidades.filter(su => su.unidade_id === unidadeId).map(su => su.servidor_id);
    const allIds = [...new Set([...primaryIds, ...extraIds])];
    return allIds.map(id => servidores.find(s => s.id === id)).filter(Boolean) as ServidorDB[];
  };
  const getServidoresByCoord = (coordId: string) => servidores.filter(s => s.coordenacao_id === coordId);
  const getDiretor = (diretoriaId: string) => servidores.find(s => s.diretoria_id === diretoriaId && s.is_diretor);
  const getAgrupamentosByDiretoria = (diretoriaId: string) => agrupamentos.filter(a => a.diretoria_id === diretoriaId);
  const getCoordMedicoByUnidade = (unidadeId: string) => servidores.filter(s => (s as any).is_coordenador_medico && s.unidade_id === unidadeId);

  // Coordenador now uses junction table - supports multiple coordinators per unidade
  const getCoordenadorByUnidade = (unidadeId: string): ServidorDB[] => {
    const cuEntries = coordenadoresUnidades.filter(cu => cu.unidade_id === unidadeId);
    return cuEntries.map(cu => servidores.find(s => s.id === cu.servidor_id)).filter(Boolean) as ServidorDB[];
  };

  // Agrupamento CRUD
  const addAgrupamento = async (nome: string, diretoriaId: string) => {
    const { error } = await supabase.from("agrupamentos").insert({ nome, diretoria_id: diretoriaId });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Agrupamento criado!" });
    setNewAgrupamento(null);
    loadData();
  };

  const deleteAgrupamento = async (id: string) => {
    // Unlink unidades first
    await supabase.from("unidades").update({ agrupamento_id: null } as any).eq("agrupamento_id", id);
    await supabase.from("agrupamentos").delete().eq("id", id);
    toast({ title: "Agrupamento removido" });
    loadData();
  };

  const setAgrupamentoCoord = async (agrupamentoId: string, servidorId: string) => {
    await supabase.from("agrupamentos").update({ coordenador_id: servidorId }).eq("id", agrupamentoId);
    toast({ title: "Coordenador de agrupamento definido!" });
    setPickingAgrupCoord(null);
    setAgrupCoordSearch("");
    loadData();
  };

  const assignUnidadeToAgrupamento = async (unidadeId: string, agrupamentoId: string | null) => {
    await supabase.from("unidades").update({ agrupamento_id: agrupamentoId } as any).eq("id", unidadeId);
    toast({ title: agrupamentoId ? "Unidade vinculada ao agrupamento!" : "Unidade desvinculada do agrupamento!" });
    loadData();
  };
  const getSecretario = () => servidores.find(s => s.is_secretario);
  const getDiretorGeral = () => servidores.find(s => (s as any).is_diretor_geral);

  const filteredAssignResults = assignSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(assignSearch.toLowerCase()) || s.matricula.includes(assignSearch)).slice(0, 30)
    : servidores.filter(s => !s.unidade_id).slice(0, 30);

  const filteredSecAssign = secAssignSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(secAssignSearch.toLowerCase()) || s.matricula.includes(secAssignSearch)).slice(0, 8)
    : servidores.filter(s => !s.diretoria_id).slice(0, 8);

  const filteredRoleResults = roleSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(roleSearch.toLowerCase()) || s.matricula.includes(roleSearch)).slice(0, 8)
    : servidores.slice(0, 8);

  const filteredSetorAssign = setorAssignSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(setorAssignSearch.toLowerCase()) || s.matricula.includes(setorAssignSearch)).slice(0, 8)
    : servidores.slice(0, 8);

  const assignRole = async (servidorId: string, type: "diretor" | "coordenador" | "coordenador_medico" | "secretario" | "diretor_geral", diretoriaId?: string, unidadeId?: string, coordId?: string) => {
    if (type === "coordenador" && unidadeId) {
      const { error } = await supabase.from("coordenadores_unidades").insert({ servidor_id: servidorId, unidade_id: unidadeId });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      await supabase.from("servidores").update({ is_coordenador: true, unidade_id: unidadeId, diretoria_id: diretoriaId }).eq("id", servidorId);
    } else if (type === "coordenador_medico" && unidadeId) {
      await supabase.from("servidores").update({ is_coordenador_medico: true, unidade_id: unidadeId, diretoria_id: diretoriaId }).eq("id", servidorId);
    } else {
      const updateData: any = type === "diretor"
        ? { is_diretor: true, diretoria_id: diretoriaId }
        : type === "diretor_geral"
        ? { is_diretor_geral: true }
        : { is_secretario: true };
      const { error } = await supabase.from("servidores").update(updateData).eq("id", servidorId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    const labels: Record<string, string> = { diretor: "Diretor(a) definido!", coordenador: "Coordenador(a) definido!", coordenador_medico: "Coordenador(a) Médico(a) definido!", secretario: "Secretário(a) definido!", diretor_geral: "Diretor(a) Geral definido!" };
    toast({ title: labels[type] });
    setPickingRole(null);
    setRoleSearch("");
    loadData();
  };

  const removeRole = async (servidorId: string, type: "diretor" | "coordenador" | "coordenador_medico" | "secretario" | "diretor_geral", unidadeId?: string) => {
    if (type === "coordenador" && unidadeId) {
      await supabase.from("coordenadores_unidades").delete().eq("servidor_id", servidorId).eq("unidade_id", unidadeId);
      const { data: remaining } = await supabase.from("coordenadores_unidades").select("id").eq("servidor_id", servidorId);
      if (!remaining || remaining.length === 0) {
        await supabase.from("servidores").update({ is_coordenador: false }).eq("id", servidorId);
      }
    } else if (type === "coordenador_medico") {
      await supabase.from("servidores").update({ is_coordenador_medico: false }).eq("id", servidorId);
    } else {
      const updateData = type === "diretor" ? { is_diretor: false } : type === "diretor_geral" ? { is_diretor_geral: false } : { is_secretario: false };
      await supabase.from("servidores").update(updateData).eq("id", servidorId);
    }
    const labels: Record<string, string> = { diretor: "Diretor removido", coordenador: "Coordenador removido", coordenador_medico: "Coord. Médico removido", secretario: "Secretário removido", diretor_geral: "Diretor Geral removido" };
    toast({ title: labels[type] });
    loadData();
  };

  const deleteCoord = async (id: string) => {
    await supabase.from("coordenacoes").delete().eq("id", id);
    toast({ title: "Coordenação removida" });
    loadData();
  };

  // Inline rename
  const saveRename = async (table: "diretorias" | "unidades" | "coordenacoes", id: string) => {
    if (!editingValue.trim()) return;
    await supabase.from(table).update({ nome: editingValue.trim() }).eq("id", id);
    setEditingId(null);
    toast({ title: "Nome atualizado!" });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Network className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Estrutura Organizacional</h1>
                <p className="text-xs text-muted-foreground">Cadastre diretorias, unidades e coordenações</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Add Diretoria - admin only */}
        {canManageStructure && (
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Nova Diretoria</h2>
          <div className="flex gap-2">
            <input
              value={newDiretoria}
              onChange={e => setNewDiretoria(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDiretoria()}
              placeholder="Nome da diretoria..."
              className="flex-1 h-10 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addDiretoria} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Criar
            </button>
          </div>
        </div>
        )}

        {/* Secretaria root card */}
        <div className="glass-card rounded-xl overflow-hidden border-2 border-primary/20">
          {/* Secretaria header */}
          <div className="flex items-center justify-between px-5 py-4 bg-primary/10">
            <button onClick={() => toggleExpand("secretaria")} className="flex items-center gap-3 flex-1 text-left">
              {expanded["secretaria"] !== false ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {isAdmin ? "Secretaria Municipal de Saúde" : "Minhas Pastas"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {diretorias.length} diretoria(s) · {isAdmin && `${servidores.length} total · ${secretariaServidores.length} no gabinete`}
                  {!isAdmin && `${unidades.length} unidade(s)`}
                </p>
              </div>
            </button>
            {/* Allocation progress - admin only */}
            {isAdmin && (
            <div className="flex items-center gap-3 mr-3">
              <span className="text-xs text-muted-foreground font-mono">
                <span className="font-bold text-foreground">{servidores.filter(s => s.diretoria_id).length}</span> alocados
              </span>
              <span className="text-xs text-warning font-mono font-bold">{secretariaServidores.length} pendentes</span>
            </div>
            )}
          </div>

          {/* Secretário picker - admin only */}
          {isAdmin && (() => {
            const secretario = getSecretario();
            return (
              <div className="px-5 py-3 border-t border-border/30 bg-muted/10 flex items-center gap-3 flex-wrap">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secretário(a):</span>
                {secretario ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{secretario.nome}</span>
                    <button onClick={() => removeRole(secretario.id, "secretario")} className="p-1 rounded text-muted-foreground hover:text-destructive" title="Remover secretário">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : pickingRole?.type === "secretario" ? (
                  <div className="flex-1 max-w-sm space-y-1">
                    <input
                      autoFocus
                      value={roleSearch}
                      onChange={e => setRoleSearch(e.target.value)}
                      placeholder="Buscar servidor..."
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                    <div className="max-h-32 overflow-y-auto bg-card rounded border border-border shadow-md">
                      {filteredRoleResults.map(s => (
                        <button key={s.id} onClick={() => assignRole(s.id, "secretario")} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                          {s.nome} <span className="text-muted-foreground">({s.matricula})</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setPickingRole(null); setRoleSearch(""); }} className="text-xs text-muted-foreground">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setPickingRole({ type: "secretario", targetId: "secretaria" })} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">
                    + Definir secretário(a)
                  </button>
                )}
              </div>
            );
          })()}

          {/* Diretor Geral picker - admin only */}
          {isAdmin && (() => {
            const diretorGeral = getDiretorGeral();
            return (
              <div className="px-5 py-3 border-t border-border/30 bg-muted/10 flex items-center gap-3 flex-wrap">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diretor(a) Geral:</span>
                {diretorGeral ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{diretorGeral.nome}</span>
                    <button onClick={() => removeRole(diretorGeral.id, "diretor_geral")} className="p-1 rounded text-muted-foreground hover:text-destructive" title="Remover diretor geral">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : pickingRole?.type === "diretor_geral" ? (
                  <div className="flex-1 max-w-sm space-y-1">
                    <input
                      autoFocus
                      value={roleSearch}
                      onChange={e => setRoleSearch(e.target.value)}
                      placeholder="Buscar servidor..."
                      className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                    <div className="max-h-32 overflow-y-auto bg-card rounded border border-border shadow-md">
                      {filteredRoleResults.map(s => (
                        <button key={s.id} onClick={() => assignRole(s.id, "diretor_geral")} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                          {s.nome} <span className="text-muted-foreground">({s.matricula})</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setPickingRole(null); setRoleSearch(""); }} className="text-xs text-muted-foreground">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setPickingRole({ type: "diretor_geral", targetId: "secretaria" })} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">
                    + Definir diretor(a) geral
                  </button>
                )}
              </div>
            );
          })()}

          {/* Servidores da Secretaria (sem diretoria) - admin only */}
          {isAdmin && expanded["secretaria"] !== false && (
            <div className="px-5 py-3 border-t border-border/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Servidores do Gabinete ({secretariaServidores.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCreateServidorTarget({})}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Novo
                  </button>
                  <button
                    onClick={() => setAssigningSecretaria(true)}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" /> Vincular ao Gabinete
                  </button>
                  {diretorias.length > 0 && (
                    <button
                      onClick={() => setAlocandoDiretoria(true)}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5" /> Alocar em Diretoria
                    </button>
                  )}
                </div>
              </div>

              {assigningSecretaria && (
                <div className="mb-3 space-y-2 max-w-md">
                  <input
                    autoFocus
                    value={secAssignSearch}
                    onChange={e => setSecAssignSearch(e.target.value)}
                    placeholder="Buscar servidor por nome ou matrícula..."
                    className="w-full h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                  <div className="max-h-48 overflow-y-auto bg-card rounded border border-border shadow-md">
                    {filteredSecAssign.map(s => {
                      const isAllocated = !!(s.diretoria_id || s.unidade_id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-primary/10 text-foreground cursor-pointer ${isAllocated ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                        >
                          <Checkbox
                            checked={secSelectedIds.has(s.id)}
                            onCheckedChange={() => {
                              setSecSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                return next;
                              });
                            }}
                          />
                          <span className="font-medium">{s.nome}</span>
                          <span className="text-muted-foreground">({s.cargo})</span>
                          <ServidorConflictBadge servidor={s} diretorias={allDiretorias} unidades={allUnidades} setores={setores} servidoresSetores={servidoresSetores} />
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    {secSelectedIds.size > 0 && (
                      <button
                        onClick={async () => {
                          await supabase.from("servidores").update({ diretoria_id: null, unidade_id: null, coordenacao_id: null }).in("id", Array.from(secSelectedIds));
                          toast({ title: `${secSelectedIds.size} servidor(es) movido(s) para o gabinete!` });
                          setAssigningSecretaria(false);
                          setSecAssignSearch("");
                          setSecSelectedIds(new Set());
                          loadData();
                        }}
                        className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Check className="h-3 w-3" /> Vincular {secSelectedIds.size} servidor(es)
                      </button>
                    )}
                    <button onClick={() => { setAssigningSecretaria(false); setSecAssignSearch(""); setSecSelectedIds(new Set()); }} className="text-xs text-muted-foreground">Cancelar</button>
                  </div>
                </div>
              )}

              {/* Alocar em Diretoria */}
              {alocandoDiretoria && (
                <div className="mb-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Alocar servidores em uma diretoria
                  </h4>
                  <select
                    value={alocDirTargetId}
                    onChange={e => setAlocDirTargetId(e.target.value)}
                    className="w-full h-8 rounded border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    <option value="">Selecione a diretoria destino...</option>
                    {diretorias.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                  <input
                    value={alocDirSearch}
                    onChange={e => setAlocDirSearch(e.target.value)}
                    placeholder="Buscar servidor por nome..."
                    className="w-full h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                  <div className="max-h-56 overflow-y-auto bg-card rounded border border-border shadow-md">
                    {(() => {
                      const filtered = alocDirSearch.length >= 2
                        ? secretariaServidores.filter(s => s.nome.toLowerCase().includes(alocDirSearch.toLowerCase()))
                        : secretariaServidores;
                      return filtered.slice(0, 50).map(s => {
                        const isAllocated = !!(s.diretoria_id || s.unidade_id);
                        return (
                          <label key={s.id} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-primary/10 text-foreground cursor-pointer ${isAllocated ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                            <Checkbox
                              checked={alocDirSelectedIds.has(s.id)}
                              onCheckedChange={() => {
                                setAlocDirSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                  return next;
                                });
                              }}
                            />
                            <span className="font-medium">{s.nome}</span>
                            <span className="text-muted-foreground">({s.cargo})</span>
                            <ServidorConflictBadge servidor={s} diretorias={allDiretorias} unidades={allUnidades} setores={setores} servidoresSetores={servidoresSetores} />
                          </label>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{alocDirSelectedIds.size} selecionado(s)</span>
                    {alocDirSelectedIds.size > 0 && alocDirTargetId && (
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from("servidores").update({ diretoria_id: alocDirTargetId }).in("id", Array.from(alocDirSelectedIds));
                          if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                          toast({ title: `${alocDirSelectedIds.size} servidor(es) alocado(s) na diretoria!` });
                          setAlocandoDiretoria(false);
                          setAlocDirSearch("");
                          setAlocDirSelectedIds(new Set());
                          setAlocDirTargetId("");
                          loadData();
                        }}
                        className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Check className="h-3 w-3" /> Alocar {alocDirSelectedIds.size}
                      </button>
                    )}
                    <button onClick={() => { setAlocandoDiretoria(false); setAlocDirSearch(""); setAlocDirSelectedIds(new Set()); setAlocDirTargetId(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                  </div>
                </div>
              )}

              <UnidadeServidores
                servidores={secretariaServidores}
                onEditServidor={setEditingServidor}
                defaultExpanded={secretariaServidores.length <= 30}
              />

              {/* Setores da Secretaria */}
              <div className="mt-4">
              <SetorList
                  setores={getSetoresByDiretoria(null)}
                  servidores={servidores}
                  diretoriaId={null}
                  onAddSetor={(nome, cargo, dirId) => {
                    supabase.from("setores").insert({ nome, cargo_gestao: cargo || null, diretoria_id: dirId }).then(({ error }) => {
                      if (!error) loadData();
                    });
                  }}
                  onDeleteSetor={deleteSetor}
                  onAssignServidor={assignServidorToSetor}
                  onBulkAssignServidor={bulkAssignServidorToSetor}
                  onSetResponsavel={setResponsavelSetor}
                  contextServidores={secretariaServidores}
                  onKeepInBothSetores={keepInBothSetores}
                  onBulkKeepInBothSetores={bulkKeepInBothSetores}
                  servidoresSetores={servidoresSetores}
                />
              </div>
            </div>
          )}

          {/* Diretorias nested inside */}
          {expanded["secretaria"] !== false && (
            <div className="px-4 pb-4 pt-2 space-y-4">
              {diretorias.length === 0 && (
                <div className="rounded-lg p-8 text-center bg-muted/20">
                  <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <h3 className="mt-3 text-base font-semibold text-foreground">Nenhuma diretoria cadastrada</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Crie a primeira diretoria acima.</p>
                </div>
              )}

              {diretorias.map(dir => {
                const dirUnidades = unidades.filter(u => u.diretoria_id === dir.id);
                const isExpanded = expanded[dir.id] !== false;

                return (
                  <div key={dir.id} className="border border-border/50 rounded-xl overflow-hidden">
                    {/* Diretoria header */}
                    <div className="flex items-center justify-between px-5 py-4 bg-primary/5">
                      <button onClick={() => toggleExpand(dir.id)} className="flex items-center gap-3 flex-1 text-left">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <Building2 className="h-5 w-5 text-primary" />
                        {editingId === dir.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && saveRename("diretorias", dir.id)}
                              className="h-8 rounded border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            <button onClick={() => saveRename("diretorias", dir.id)} className="text-primary hover:text-primary/80"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-base font-bold text-foreground">{dir.nome}</h3>
                            <p className="text-xs text-muted-foreground">{dirUnidades.length} unidade(s)</p>
                          </div>
                        )}
                      </button>
                      {canManageDiretoria(dir.id) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCreateServidorTarget({ diretoria_id: dir.id })}
                          className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Novo servidor"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                        {canManageStructure && (
                        <>
                        <button onClick={() => { setEditingId(dir.id); setEditingValue(dir.nome); }} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteDiretoria(dir.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        </>
                        )}
                      </div>
                      )}
                    </div>

                    {/* Diretor picker */}
                    {isExpanded && (() => {
                      const diretor = getDiretor(dir.id);
                      return (
                        <div className="px-5 py-3 border-t border-border/30 bg-muted/10 flex items-center gap-3 flex-wrap">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diretor(a):</span>
                          {diretor ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{diretor.nome}</span>
                              <button onClick={() => removeRole(diretor.id, "diretor")} className="p-1 rounded text-muted-foreground hover:text-destructive" title="Remover diretor">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : pickingRole?.type === "diretor" && pickingRole.targetId === dir.id ? (
                            <div className="flex-1 max-w-sm space-y-1">
                              <input
                                autoFocus
                                value={roleSearch}
                                onChange={e => setRoleSearch(e.target.value)}
                                placeholder="Buscar servidor..."
                                className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                              />
                              <div className="max-h-32 overflow-y-auto bg-card rounded border border-border shadow-md">
                                {filteredRoleResults.map(s => (
                                  <button key={s.id} onClick={() => assignRole(s.id, "diretor", dir.id)} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                                    {s.nome} <span className="text-muted-foreground">({s.matricula})</span>
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => { setPickingRole(null); setRoleSearch(""); }} className="text-xs text-muted-foreground">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setPickingRole({ type: "diretor", targetId: dir.id })} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">
                              + Definir diretor(a)
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {isExpanded && (() => {
                      const dirServidoresDiretos = servidores.filter(s => s.diretoria_id === dir.id && !s.unidade_id);
                      return (
                      <div className="px-5 pb-4 space-y-3 pt-3">
                        {/* Servidores diretamente na diretoria (sem unidade) */}
                        <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/10">
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Servidores da Diretoria ({dirServidoresDiretos.length})
                              </span>
                              <span className="text-[10px] text-muted-foreground">(sem unidade específica)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCreateServidorTarget({ diretoria_id: dir.id })}
                                className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                              >
                                <UserPlus className="h-3.5 w-3.5" /> Novo
                              </button>
                              <button
                                onClick={() => setAssigningTo({ type: "unidade" as any, id: `dir-${dir.id}`, diretoria_id: dir.id })}
                                className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                              >
                                <Users className="h-3.5 w-3.5" /> Vincular
                              </button>
                            </div>
                          </div>

                          {/* Assign directly to diretoria */}
                          {assigningTo?.id === `dir-${dir.id}` && (
                            <div className="px-4 py-3 border-t border-border/30 space-y-2">
                              <input
                                autoFocus
                                value={assignSearch}
                                onChange={e => setAssignSearch(e.target.value)}
                                placeholder="Buscar servidor por nome ou matrícula..."
                                className="w-full h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                              />
                              <div className="max-h-48 overflow-y-auto bg-card rounded border border-border shadow-md">
                                {filteredAssignResults.map(s => {
                                  const isAllocated = !!(s.unidade_id || s.diretoria_id);
                                  return (
                                    <label
                                      key={s.id}
                                      className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-primary/10 text-foreground cursor-pointer ${isAllocated ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                                    >
                                      <Checkbox
                                        checked={assignSelectedIds.has(s.id)}
                                        onCheckedChange={() => {
                                          setAssignSelectedIds(prev => {
                                            const next = new Set(prev);
                                            if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                            return next;
                                          });
                                        }}
                                      />
                                      <span className="font-medium">{s.nome}</span>
                                      <span className="text-muted-foreground">({s.matricula})</span>
                                      <ServidorConflictBadge servidor={s} diretorias={allDiretorias} unidades={allUnidades} setores={setores} servidoresSetores={servidoresSetores} />
                                    </label>
                                  );
                                })}
                                {filteredAssignResults.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-1 px-2">Nenhum servidor encontrado</p>
                                )}
                              </div>
                              {(() => {
                                const allocatedCount = Array.from(assignSelectedIds).filter(id => {
                                  const s = servidores.find(srv => srv.id === id);
                                  return s && (s.unidade_id || s.diretoria_id);
                                }).length;
                                return <ServidorAlreadyAllocatedWarning count={allocatedCount} />;
                              })()}
                              <div className="flex items-center gap-2">
                                {assignSelectedIds.size > 0 && (
                                  <button
                                    onClick={async () => {
                                      const ids = Array.from(assignSelectedIds);
                                      const { error } = await supabase.from("servidores").update({ diretoria_id: dir.id, unidade_id: null, coordenacao_id: null }).in("id", ids);
                                      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                                      toast({ title: `${ids.length} servidor(es) vinculado(s) à diretoria!` });
                                      setAssigningTo(null);
                                      setAssignSearch("");
                                      setAssignSelectedIds(new Set());
                                      loadData();
                                    }}
                                    className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                                  >
                                    <Check className="h-3 w-3" /> Vincular {assignSelectedIds.size} servidor(es)
                                  </button>
                                )}
                                <button onClick={() => { setAssigningTo(null); setAssignSearch(""); setAssignSelectedIds(new Set()); }} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                              </div>
                            </div>
                          )}

                          {dirServidoresDiretos.length > 0 && (
                            <div className="border-t border-border/30">
                              <UnidadeServidores
                                servidores={dirServidoresDiretos}
                                onEditServidor={setEditingServidor}
                                defaultExpanded={dirServidoresDiretos.length <= 30}
                              />
                            </div>
                          )}
                        </div>

                        {/* Add Unidade */}
                        {newUnidade?.diretoria_id === dir.id ? (
                          <div className="flex gap-2 items-center bg-muted/30 rounded-lg p-3">
                            <input
                              autoFocus
                              value={newUnidade.sigla}
                              onChange={e => setNewUnidade({ ...newUnidade, sigla: e.target.value })}
                              placeholder="Sigla (ex: CRA)"
                              className="w-24 h-9 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            <input
                              value={newUnidade.nome}
                              onChange={e => setNewUnidade({ ...newUnidade, nome: e.target.value })}
                              onKeyDown={e => e.key === "Enter" && addUnidade()}
                              placeholder="Nome completo da unidade..."
                              className="flex-1 h-9 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            <button onClick={addUnidade} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setNewUnidade(null)} className="h-9 px-2 rounded-lg text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setNewUnidade({ nome: "", sigla: "", diretoria_id: dir.id })}
                            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            <Plus className="h-4 w-4" /> Adicionar unidade
                          </button>
                        )}

                        {/* Setores da Diretoria */}
                        <SetorList
                          setores={getSetoresByDiretoria(dir.id)}
                          servidores={servidores}
                          diretoriaId={dir.id}
                          onAddSetor={(nome, cargo, dirId) => {
                            supabase.from("setores").insert({ nome, cargo_gestao: cargo || null, diretoria_id: dirId }).then(({ error }) => {
                              if (!error) loadData();
                            });
                          }}
                          onDeleteSetor={deleteSetor}
                          onAssignServidor={assignServidorToSetor}
                          onBulkAssignServidor={bulkAssignServidorToSetor}
                          onSetResponsavel={setResponsavelSetor}
                          contextServidores={servidores.filter(s => s.diretoria_id === dir.id)}
                          onKeepInBothSetores={keepInBothSetores}
                          onBulkKeepInBothSetores={bulkKeepInBothSetores}
                          servidoresSetores={servidoresSetores}
                        />

                        {/* ═══ Agrupamentos ═══ */}
                        {(() => {
                          const dirAgrupamentos = getAgrupamentosByDiretoria(dir.id);
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Layers className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agrupamentos de Unidades ({dirAgrupamentos.length})</span>
                                {newAgrupamento?.diretoria_id === dir.id ? (
                                  <div className="flex items-center gap-2 ml-2">
                                    <input
                                      autoFocus
                                      value={newAgrupamento.nome}
                                      onChange={e => setNewAgrupamento({ ...newAgrupamento, nome: e.target.value })}
                                      onKeyDown={e => e.key === "Enter" && addAgrupamento(newAgrupamento.nome, dir.id)}
                                      placeholder="Nome do agrupamento..."
                                      className="h-7 w-56 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                    />
                                    <button onClick={() => addAgrupamento(newAgrupamento.nome, dir.id)} className="text-primary"><Check className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setNewAgrupamento(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => setNewAgrupamento({ nome: "", diretoria_id: dir.id })} className="text-xs text-primary font-medium hover:text-primary/80 ml-2">
                                    + Novo agrupamento
                                  </button>
                                )}
                              </div>
                              {dirAgrupamentos.map(agrup => {
                                const agrupCoord = agrup.coordenador_id ? servidores.find(s => s.id === agrup.coordenador_id) : null;
                                const agrupUnidades = dirUnidades.filter(u => (u as any).agrupamento_id === agrup.id);
                                return (
                                  <div key={agrup.id} className="border border-primary/20 rounded-lg overflow-hidden bg-primary/5">
                                    <div className="flex items-center justify-between px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-bold text-foreground">{agrup.nome}</span>
                                        <span className="text-xs text-muted-foreground">({agrupUnidades.length} unidade{agrupUnidades.length !== 1 ? "s" : ""})</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {/* Coordenador do agrupamento */}
                                        {agrupCoord ? (
                                          <div className="flex items-center gap-1.5 text-xs">
                                            <Star className="h-3 w-3 text-amber-500" />
                                            <span className="font-medium text-foreground">{agrupCoord.nome}</span>
                                            <button onClick={() => { supabase.from("agrupamentos").update({ coordenador_id: null }).eq("id", agrup.id).then(() => loadData()); }} className="p-0.5 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                                          </div>
                                        ) : pickingAgrupCoord === agrup.id ? (
                                          <div className="space-y-1">
                                            <input autoFocus value={agrupCoordSearch} onChange={e => setAgrupCoordSearch(e.target.value)} placeholder="Buscar..." className="h-6 w-40 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                                            <div className="max-h-24 overflow-y-auto bg-card rounded border border-border shadow-md absolute z-10">
                                              {(agrupCoordSearch.length >= 2 ? servidores.filter(s => s.nome.toLowerCase().includes(agrupCoordSearch.toLowerCase())).slice(0, 5) : servidores.slice(0, 5)).map(s => (
                                                <button key={s.id} onClick={() => setAgrupamentoCoord(agrup.id, s.id)} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">{s.nome}</button>
                                              ))}
                                            </div>
                                            <button onClick={() => { setPickingAgrupCoord(null); setAgrupCoordSearch(""); }} className="text-[10px] text-muted-foreground">Cancelar</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setPickingAgrupCoord(agrup.id)} className="text-xs text-primary font-medium">+ Coordenador</button>
                                        )}
                                        {/* Add unidade to this agrupamento */}
                                        <select
                                          className="h-7 rounded border border-input bg-card px-1 text-xs text-foreground"
                                          value=""
                                          onChange={e => { if (e.target.value) assignUnidadeToAgrupamento(e.target.value, agrup.id); }}
                                        >
                                          <option value="">+ Vincular unidade</option>
                                          {dirUnidades.filter(u => !(u as any).agrupamento_id).map(u => (
                                            <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>
                                          ))}
                                        </select>
                                        <button onClick={() => deleteAgrupamento(agrup.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                                      </div>
                                    </div>
                                    {agrupUnidades.length > 0 && (
                                      <div className="px-4 pb-2 space-y-1">
                                        {agrupUnidades.map(u => (
                                          <div key={u.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-card/50">
                                            <span className="font-medium text-foreground">{u.sigla} — {u.nome}</span>
                                            <button onClick={() => assignUnidadeToAgrupamento(u.id, null)} className="text-muted-foreground hover:text-destructive text-[10px]">desvincular</button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Unidades list */}
                        {dirUnidades.map(uni => {
                          const uniExpanded = expanded[uni.id] !== false;

                          return (
                            <div key={uni.id} className="border border-border/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                                <button onClick={() => toggleExpand(uni.id)} className="flex items-center gap-2 flex-1 text-left">
                                  {uniExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  {editingId === uni.id ? (
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                      <input
                                        autoFocus
                                        value={editingValue}
                                        onChange={e => setEditingValue(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && saveRename("unidades", uni.id)}
                                        className="h-7 rounded border border-input bg-card px-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                      />
                                      <button onClick={() => saveRename("unidades", uni.id)} className="text-primary"><Check className="h-3.5 w-3.5" /></button>
                                      <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-foreground">{uni.sigla}</span>
                                      <span className="text-sm text-muted-foreground">— {uni.nome}</span>
                                      <span className="flex items-center gap-1 text-xs font-medium text-primary ml-2">
                                        <Users className="h-3 w-3" />
                                        {getServidoresByUnidade(uni.id).length} servidores
                                      </span>
                                    </div>
                                  )}
                                </button>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setCreateServidorTarget({ diretoria_id: dir.id, unidade_id: uni.id })}
                                    className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Novo servidor nesta unidade"
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setAssigningTo({ type: "unidade", id: uni.id, diretoria_id: dir.id })}
                                    className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Vincular servidor existente"
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => { setEditingId(uni.id); setEditingValue(uni.nome); }} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => deleteUnidade(uni.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Assign to unidade dropdown */}
                              {assigningTo?.type === "unidade" && assigningTo.id === uni.id && (
                                <div className="px-5 py-3 border-t border-border/30 space-y-2">
                                  <input
                                    autoFocus
                                    value={assignSearch}
                                    onChange={e => setAssignSearch(e.target.value)}
                                    placeholder="Buscar servidor por nome ou matrícula..."
                                    className="w-full h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                  />
                                  <div className="max-h-48 overflow-y-auto bg-card rounded border border-border shadow-md">
                                    {filteredAssignResults.map(s => {
                                      const isAllocated = !!(s.unidade_id || s.diretoria_id);
                                      return (
                                        <label
                                          key={s.id}
                                          className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-primary/10 text-foreground cursor-pointer ${isAllocated ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                                        >
                                          <Checkbox
                                            checked={assignSelectedIds.has(s.id)}
                                            onCheckedChange={() => {
                                              setAssignSelectedIds(prev => {
                                                const next = new Set(prev);
                                                if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                                return next;
                                              });
                                            }}
                                          />
                                          <span className="font-medium">{s.nome}</span>
                                          <span className="text-muted-foreground">({s.matricula})</span>
                                          <ServidorConflictBadge servidor={s} diretorias={allDiretorias} unidades={allUnidades} setores={setores} servidoresSetores={servidoresSetores} />
                                        </label>
                                      );
                                    })}
                                    {filteredAssignResults.length === 0 && (
                                      <p className="text-xs text-muted-foreground py-1 px-2">Nenhum servidor encontrado</p>
                                    )}
                                  </div>
                                  {(() => {
                                    const allocatedCount = Array.from(assignSelectedIds).filter(id => {
                                      const s = servidores.find(srv => srv.id === id);
                                      return s && (s.unidade_id || s.diretoria_id);
                                    }).length;
                                    return <ServidorAlreadyAllocatedWarning count={allocatedCount} />;
                                  })()}
                                  <div className="flex items-center gap-2">
                                    {assignSelectedIds.size > 0 && (
                                      <button
                                        onClick={async () => {
                                          const ok = await assignServidoresToUnidade(
                                            Array.from(assignSelectedIds),
                                            assigningTo.diretoria_id,
                                            uni.id
                                          );

                                          if (!ok) return;

                                          setAssigningTo(null);
                                          setAssignSearch("");
                                          setAssignSelectedIds(new Set());
                                          loadData();
                                        }}
                                        className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                                      >
                                        <Check className="h-3 w-3" /> Vincular {assignSelectedIds.size} servidor(es)
                                      </button>
                                    )}
                                    <button onClick={() => { setAssigningTo(null); setAssignSearch(""); setAssignSelectedIds(new Set()); }} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                                  </div>
                                </div>
                              )}

                              {/* Coordenador picker - now supports multiple */}
                              {uniExpanded && (
                                <div className="px-4 pb-3 pt-2 space-y-2 ml-6">
                                  {(() => {
                                    const coordenadores = getCoordenadorByUnidade(uni.id);
                                    return (
                                      <div className="space-y-1.5 py-1.5">
                                        <div className="flex items-center gap-2">
                                          <Star className="h-3.5 w-3.5 text-amber-500" />
                                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coordenador(es):</span>
                                        </div>
                                        {coordenadores.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {coordenadores.map(coord => {
                                              const outrasUnidades = coordenadoresUnidades
                                                .filter(cu => cu.servidor_id === coord.id && cu.unidade_id !== uni.id)
                                                .map(cu => unidades.find(u => u.id === cu.unidade_id))
                                                .filter(Boolean);
                                              return (
                                                <div key={coord.id} className="flex items-center gap-1.5 rounded-md bg-accent/50 px-2 py-1">
                                                  <span className="text-sm font-medium text-foreground">{coord.nome}</span>
                                                  {outrasUnidades.length > 0 && (
                                                    <span className="text-[10px] text-primary font-medium" title={`Também coordena: ${outrasUnidades.map(u => u!.sigla).join(", ")}`}>
                                                      (+{outrasUnidades.length} {outrasUnidades.length === 1 ? "unidade" : "unidades"}: {outrasUnidades.map(u => u!.sigla).join(", ")})
                                                    </span>
                                                  )}
                                                  <button onClick={() => removeRole(coord.id, "coordenador", uni.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive" title="Remover coordenador">
                                                    <X className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {pickingRole?.type === "coordenador" && pickingRole.targetId === uni.id ? (
                                          <div className="max-w-sm space-y-1">
                                            <input
                                              autoFocus
                                              value={roleSearch}
                                              onChange={e => setRoleSearch(e.target.value)}
                                              placeholder="Buscar servidor..."
                                              className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                            />
                                            <div className="max-h-32 overflow-y-auto bg-card rounded border border-border shadow-md">
                                              {filteredRoleResults.filter(s => !coordenadores.some(c => c.id === s.id)).map(s => (
                                                <button key={s.id} onClick={() => assignRole(s.id, "coordenador", dir.id, uni.id)} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                                                  {s.nome} <span className="text-muted-foreground">({s.matricula})</span>
                                                </button>
                                              ))}
                                            </div>
                                            <button onClick={() => { setPickingRole(null); setRoleSearch(""); }} className="text-xs text-muted-foreground">Cancelar</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setPickingRole({ type: "coordenador", targetId: uni.id, diretoriaId: dir.id, unidadeId: uni.id })} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">
                                            + Adicionar coordenador(a)
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Coordenador Médico picker */}
                              {uniExpanded && (
                                <div className="px-4 pb-3 ml-6">
                                  {(() => {
                                    const coordsMedicos = getCoordMedicoByUnidade(uni.id);
                                    return (
                                      <div className="space-y-1.5 py-1.5">
                                        <div className="flex items-center gap-2">
                                          <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coordenador(es) Médico(s):</span>
                                        </div>
                                        {coordsMedicos.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {coordsMedicos.map(cm => (
                                              <div key={cm.id} className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1">
                                                <Stethoscope className="h-3 w-3 text-emerald-600" />
                                                <span className="text-sm font-medium text-foreground">{cm.nome}</span>
                                                <button onClick={() => removeRole(cm.id, "coordenador_medico")} className="p-0.5 rounded text-muted-foreground hover:text-destructive" title="Remover coord. médico">
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {pickingRole?.type === "coordenador_medico" && pickingRole.targetId === uni.id ? (
                                          <div className="max-w-sm space-y-1">
                                            <input
                                              autoFocus
                                              value={roleSearch}
                                              onChange={e => setRoleSearch(e.target.value)}
                                              placeholder="Buscar servidor..."
                                              className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                            />
                                            <div className="max-h-32 overflow-y-auto bg-card rounded border border-border shadow-md">
                                              {filteredRoleResults.filter(s => !coordsMedicos.some(c => c.id === s.id)).map(s => (
                                                <button key={s.id} onClick={() => assignRole(s.id, "coordenador_medico", dir.id, uni.id)} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                                                  {s.nome} <span className="text-muted-foreground">({s.matricula})</span>
                                                </button>
                                              ))}
                                            </div>
                                            <button onClick={() => { setPickingRole(null); setRoleSearch(""); }} className="text-xs text-muted-foreground">Cancelar</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setPickingRole({ type: "coordenador_medico", targetId: uni.id, diretoriaId: dir.id, unidadeId: uni.id })} className="text-xs text-emerald-600 font-medium hover:text-emerald-500 transition-colors">
                                            + Adicionar coordenador(a) médico(a)
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Equipes de Saúde */}
                              {uniExpanded && (
                                <div className="px-4 pb-3 ml-6">
                                  <EquipeSaudeList
                                    equipes={equipesSaude}
                                    servidoresEquipes={servidoresEquipes}
                                    servidores={servidores}
                                    unidadeId={uni.id}
                                    contextServidores={getServidoresByUnidade(uni.id)}
                                    onReload={loadData}
                                  />
                                </div>
                              )}

                              {/* Funções da unidade */}
                              {uniExpanded && (
                                <div className="px-4 pb-3 ml-6">
                                  <FuncaoList
                                    funcoes={getFuncoesByUnidade(uni.id)}
                                    servidores={servidores}
                                    unidadeId={uni.id}
                                    onAddFuncao={async (nome, unidadeId) => {
                                      const { error } = await supabase.from("funcoes").insert({ nome, unidade_id: unidadeId });
                                      if (!error) loadData();
                                      else toast({ title: "Erro", description: error.message, variant: "destructive" });
                                    }}
                                    onDeleteFuncao={async (id) => {
                                      await supabase.from("servidores").update({ funcao_id: null } as any).eq("funcao_id", id);
                                      await supabase.from("funcoes").delete().eq("id", id);
                                      toast({ title: "Função removida" });
                                      loadData();
                                    }}
                                    onAssignServidor={async (ids, funcaoId) => {
                                      const { error } = await supabase.from("servidores").update({ funcao_id: funcaoId } as any).in("id", ids);
                                      if (!error) { toast({ title: `${ids.length} servidor(es) vinculado(s)!` }); loadData(); }
                                      else toast({ title: "Erro", description: error.message, variant: "destructive" });
                                    }}
                                    contextServidores={getServidoresByUnidade(uni.id)}
                                  />
                                </div>
                              )}

                              {/* Cargos e servidores da unidade */}
                              {uniExpanded && (
                                <div className="px-4 pb-3 ml-6">
                                  <UnidadeServidores
                                    servidores={getServidoresByUnidade(uni.id)}
                                    onEditServidor={setEditingServidor}
                                    title="Servidores por cargo"
                                    defaultExpanded={getServidoresByUnidade(uni.id).length <= 20}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <CreateServidorModal
        open={!!createServidorTarget}
        onClose={() => setCreateServidorTarget(null)}
        onSaved={loadData}
        diretorias={diretorias}
        unidades={unidades}
        coordenacoes={coordenacoes}
        defaultDiretoriaId={createServidorTarget?.diretoria_id}
        defaultUnidadeId={createServidorTarget?.unidade_id}
        defaultCoordenacaoId={createServidorTarget?.coordenacao_id}
      />

      <EditServidorModal
        servidor={editingServidor}
        open={!!editingServidor}
        onClose={() => setEditingServidor(null)}
        onSaved={loadData}
        diretorias={diretorias}
        unidades={unidades}
        coordenacoes={coordenacoes}
      />
    </div>
  );
}

export default function Estrutura() {
  return <EstruturaContent />;
}
