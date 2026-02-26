export type StatusPresenca = "presente" | "ausente" | "ferias" | "afastado" | "licenca";

export type StatusFerias = 
  | "PROGRAMADA" 
  | "EM ANDAMENTO" 
  | "RISCO ADMINISTRATIVO" 
  | "SEM ANO DE REFERÊNCIA"
  | "CONCLUÍDA";

export type Vinculo = 
  | "CONCURSADO (EFETIVO)" 
  | "CONCURSADO (PROBATÓRIO)" 
  | "CONTRATO TEMPORARIO" 
  | "CONTRATO (PLANTÃO)"
  | string;

export interface Escala {
  inicio1: string;
  fim1: string;
  inicio2?: string;
  fim2?: string;
  totalHoras: number;
}

export interface Ferias {
  anoReferencia?: number;
  statusGerencial: StatusFerias;
  periodo1Inicio?: string;
  periodo1Fim?: string;
  periodo2Inicio?: string;
  periodo2Fim?: string;
  totalDias: number;
  feriasVencidas?: number;
}

export interface Servidor {
  id: string;
  nome: string;
  matricula: string;
  cargo: string;
  local: string;
  setor: string;
  funcaoCritica: boolean;
  coberturaPrevista: string;
  vinculo: string;
  observacao?: string;
  statusPresenca: StatusPresenca;
  escala?: Escala;
  ferias?: Ferias;
  unidadeId: string;
  coordenacaoId?: string;
}

export interface Coordenacao {
  id: string;
  nome: string;
  unidadeId: string;
  coordenador?: Servidor;
  servidores: Servidor[];
}

export interface Unidade {
  id: string;
  nome: string;
  sigla: string;
  diretoriaId: string;
  coordenacoes: Coordenacao[];
}

export interface Diretoria {
  id: string;
  nome: string;
  diretor?: Servidor;
  unidades: Unidade[];
}
