import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAfastadoLikeStatus } from "@/lib/presencaStatus";

export interface ServidorDB {
  id: string;
  nome: string;
  matricula: string;
  cargo: string;
  local_trabalho: string;
  setor: string;
  funcao_critica: boolean;
  cobertura_prevista: string;
  vinculo: string;
  status_presenca: string;
  observacao: string | null;
  escala_inicio1: string | null;
  escala_fim1: string | null;
  escala_inicio2: string | null;
  escala_fim2: string | null;
  escala_total_horas: number | null;
  ferias_ano_referencia: number | null;
  ferias_status_gerencial: string | null;
  ferias_periodo1_inicio: string | null;
  ferias_periodo1_fim: string | null;
  ferias_periodo2_inicio: string | null;
  ferias_periodo2_fim: string | null;
  ferias_total_dias: number | null;
  ferias_vencidas: number | null;
  diretoria_id: string | null;
  unidade_id: string | null;
  coordenacao_id: string | null;
  is_diretor: boolean;
  is_coordenador: boolean;
  is_secretario: boolean;
  is_diretor_geral: boolean;
  is_coordenador_medico: boolean;
  created_at: string;
  updated_at: string;
  setor_id: string | null;
  salario: number;
  data_admissao: string | null;
  data_encerramento_contrato: string | null;
  tipo_escala: string;
  vinculo2: string | null;
  duplo_vinculo: boolean;
  data_nascimento: string | null;
  email: string | null;
}

export interface AgrupamentoDB {
  id: string;
  nome: string;
  diretoria_id: string;
  coordenador_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaltaAbonadaDB {
  id: string;
  servidor_id: string;
  data: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiretoriaDB {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface UnidadeDB {
  id: string;
  nome: string;
  sigla: string;
  diretoria_id: string;
  agrupamento_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoordenacaoDB {
  id: string;
  nome: string;
  unidade_id: string;
  created_at: string;
  updated_at: string;
}

export interface SetorDB {
  id: string;
  nome: string;
  diretoria_id: string | null;
  cargo_gestao: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FuncaoDB {
  id: string;
  nome: string;
  unidade_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoordenadorUnidadeDB {
  id: string;
  servidor_id: string;
  unidade_id: string;
  created_at: string;
}

export interface AtestadoDB {
  id: string;
  servidor_id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface AfastamentoDB {
  id: string;
  servidor_id: string;
  motivo: string;
  data_inicio: string;
  data_fim: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all rows from servidores bypassing the 1000-row default limit
async function fetchAllServidores(selectCols = "*"): Promise<ServidorDB[]> {
  const PAGE = 1000;
  let offset = 0;
  let allRows: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("servidores")
      .select(selectCols)
      .order("nome")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return allRows as ServidorDB[];
}

// Queries
export function useDiretorias() {
  return useQuery({
    queryKey: ["diretorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("diretorias").select("*").order("nome");
      if (error) throw error;
      return data as DiretoriaDB[];
    },
  });
}

export function useUnidades() {
  return useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unidades").select("*").order("nome");
      if (error) throw error;
      return data as UnidadeDB[];
    },
  });
}

export function useCoordenacoes() {
  return useQuery({
    queryKey: ["coordenacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coordenacoes").select("*").order("nome");
      if (error) throw error;
      return data as CoordenacaoDB[];
    },
  });
}

export function useServidores() {
  return useQuery({
    queryKey: ["servidores"],
    queryFn: async () => {
      return fetchAllServidores();
    },
  });
}

// Realtime subscription hook
export function useServidoresRealtime() {
  const queryClient = useQueryClient();

  const query = useServidores();

  // Set up realtime subscription
  const channel = supabase
    .channel("servidores-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "servidores" }, () => {
      queryClient.invalidateQueries({ queryKey: ["servidores"] });
    })
    .subscribe();

  return { ...query, channel };
}

// Computed stats from data (no hook dependency)
export function computeStats(servidores: ServidorDB[]) {
  const total = servidores.length;
  const presentes = servidores.filter((s) => s.status_presenca === "presente").length;
  const ferias = servidores.filter((s) => s.status_presenca === "ferias").length;
  const afastados = servidores.filter((s) => isAfastadoLikeStatus(s.status_presenca)).length;
  const ausentes = servidores.filter((s) => s.status_presenca === "ausente").length;
  const folga = servidores.filter((s) => s.status_presenca === "folga").length;
  const funcoesCriticas = servidores.filter((s) => s.funcao_critica).length;
  const concursados = servidores.filter((s) => (s.vinculo || "").includes("CONCURSADO")).length;
  const contratados = servidores.filter((s) => (s.vinculo || "").includes("CONTRATO")).length;

  return { total, presentes, ferias, afastados, ausentes, folga, funcoesCriticas, concursados, contratados };
}
