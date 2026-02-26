import type { Diretoria, Servidor, Coordenacao, Unidade } from "@/types/servidor";

// Helper to create servidor objects
const srv = (
  id: string,
  nome: string,
  matricula: string,
  cargo: string,
  local: string,
  setor: string,
  vinculo: string,
  statusPresenca: "presente" | "ausente" | "ferias" | "afastado" | "licenca",
  unidadeId: string,
  opts: Partial<Servidor> = {}
): Servidor => ({
  id,
  nome,
  matricula,
  cargo,
  local,
  setor,
  funcaoCritica: opts.funcaoCritica ?? false,
  coberturaPrevista: opts.coberturaPrevista ?? "PARCIAL",
  vinculo,
  observacao: opts.observacao,
  statusPresenca,
  escala: opts.escala,
  ferias: opts.ferias,
  unidadeId,
  coordenacaoId: opts.coordenacaoId,
});

// ========== DIRETORIA COMPLEXO REGULADOR ==========
const directorServidor = srv(
  "dir-1", "JOSE FRANCISCO BORGES DE ALMEIDA", "325851",
  "ASSISTENTE ADMINISTRATIVO", "SMS", "DIRETORIA",
  "ASSESSOR DE SAUDE FAMILIAR", "presente", "diretoria-cr",
  {
    funcaoCritica: true,
    escala: { inicio1: "08:00", fim1: "14:00", totalHoras: 6 },
    ferias: { anoReferencia: 2026, statusGerencial: "PROGRAMADA", periodo1Inicio: "03/08/2026", periodo1Fim: "17/08/2026", totalDias: 15 },
  }
);

// CRA - Coordenação
const craCoordServidores: Servidor[] = [
  srv("cra-c1", "SANDRO LUIS FERREIRA ROTIROTI", "32648001", "ASSISTENTE ADMINISTRATIVO", "CRA - COORDENAÇÃO", "COORDENAÇÃO GERAL", "ASSESSOR TECNICO OPERACIONAL SAUDE", "presente", "cra",
    { funcaoCritica: true, escala: { inicio1: "08:00", fim1: "14:00", totalHoras: 6 }, ferias: { statusGerencial: "RISCO ADMINISTRATIVO", periodo1Inicio: "30/01/2026", periodo1Fim: "13/02/2026", totalDias: 15 } }),
  srv("cra-c2", "GABRIELA BATISTA", "32645001", "MEDICO CLINICO", "CRA - COORDENAÇÃO", "COORDENAÇÃO MÉDICA", "ASSESSOR DE GESTÃO DE SAUDE PUBLICA", "ferias", "cra",
    { escala: { inicio1: "08:00", fim1: "14:00", totalHoras: 6 }, ferias: { statusGerencial: "EM ANDAMENTO", periodo1Inicio: "19/02/2026", periodo1Fim: "05/03/2026", totalDias: 15 } }),
];

// CRA - Servidores
const craServidores: Servidor[] = [
  srv("cra-s1", "ALEXANDRE JUNITI KATUYAMA", "15181001", "ASSISTENTE ADMINISTRATIVO", "CRA - ADM", "SISREG / CORE", "CONCURSADO (EFETIVO)", "presente", "cra",
    { escala: { inicio1: "12:00", fim1: "18:00", totalHoras: 6 }, ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", periodo1Inicio: "03/03/2026", periodo1Fim: "01/04/2026", totalDias: 30 } }),
  srv("cra-s2", "BRUNA ALVES TAVEIRA UENO", "22370001", "CIRURGIAO DENTISTA ENDODONTISTA", "CRA - ADM", "REGULADOR", "CONCURSADO (EFETIVO)", "presente", "cra",
    { ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", totalDias: 30 } }),
  srv("cra-s3", "DAIANE DA SILVA BONONI", "31493001", "ASSISTENTE ADMINISTRATIVO", "CRA - ADM", "SISREG / CORE", "COORDENADOR DE ASSISTENCIA GESTAO POLITICAS PUBLICAS", "presente", "cra",
    { escala: { inicio1: "07:00", fim1: "13:00", totalHoras: 6 } }),
  srv("cra-s4", "DEBORA CAROLINE BONONI GOMES", "17779001", "ASSISTENTE ADMINISTRATIVO", "CRA - ADM", "SISREG - CONTRATOS", "CONCURSADO (EFETIVO)", "presente", "cra",
    { escala: { inicio1: "07:00", fim1: "13:00", totalHoras: 6 } }),
  srv("cra-s5", "DIOGO CAETANO VERZA", "30578001", "ASSISTENTE ADMINISTRATIVO", "CRA - ADM", "TELEMEDICINA / CORE", "CONCURSADO (PROBATÓRIO)", "presente", "cra",
    { escala: { inicio1: "12:00", fim1: "18:00", totalHoras: 6 } }),
  srv("cra-s6", "FERNANDA RODRIGUES GONCALVES ALMEIDA", "5639001", "ASSISTENTE ADMINISTRATIVO", "CRA - ADM", "CIRURGIAS ELETIVAS", "CONCURSADO (EFETIVO)", "presente", "cra",
    { escala: { inicio1: "07:00", fim1: "13:00", totalHoras: 6 } }),
  srv("cra-s7", "HILDNEY ALVES DE OLIVEIRA", "28026001", "MEDICO CLINICO", "CRA - ADM", "REGULADOR", "CONTRATO (PLANTÃO)", "presente", "cra"),
  srv("cra-s8", "HUGO KORIN DA SILVA", "14453001", "AGENTE DE INFORMATICA", "CRA - ADM", "TELEMEDICINA / CORE", "CONCURSADO (EFETIVO)", "presente", "cra",
    { escala: { inicio1: "07:00", fim1: "13:00", totalHoras: 6 } }),
  srv("cra-s9", "LUCIANA ASSI DE LIMA", "12009001", "PSICOLOGO CLINICO", "CRA - ADM", "REGULADOR", "CONCURSADO (EFETIVO)", "afastado", "cra",
    { observacao: "ATESTADO MÉDICO" }),
  srv("cra-s10", "VANESSA AZAMBUJA BERNARDO", "8519001", "MEDICO CLINICO", "CRA - ADM", "REGULADOR", "CONCURSADO (EFETIVO)", "presente", "cra"),
];

// CRTE - Coordenação
const crteCoordServidor = srv("crte-c1", "PLINIO GUSTAVO DOS SANTOS OLIVEIRA DE NOVAES", "33131001", "TECNICO EM ENFERMAGEM", "CRT - COORDENAÇÃO", "COORDENAÇÃO GERAL", "ASSESSOR TECNICO OPERACIONAL SAUDE", "presente", "crte",
  { funcaoCritica: true, escala: { inicio1: "08:00", fim1: "14:00", totalHoras: 6 } });

// CRTE - Setor Social
const crteSocialServidores: Servidor[] = [
  srv("crte-ss1", "DEYZIELLE NUNES DE JESUS", "32974001", "ASSISTENTE SOCIAL", "CRT - ADM", "ASSISTENCIA SOCIAL", "CONTRATO TEMPORARIO", "presente", "crte",
    { escala: { inicio1: "11:00", fim1: "17:00", totalHoras: 6 } }),
  srv("crte-ss2", "FRANCISCA EDILEUSA DA SILVA", "5868001", "AUXILIAR DE SERVIÇOS DIVERSOS", "CRT - ADM", "GUIA DE VIAGEM", "CONCURSADO (EFETIVO)", "presente", "crte"),
  srv("crte-ss3", "MARIANA DE MOURA CAMPOS", "33039001", "TECNICO ADMNISTRATIVO", "CRT - ADM", "ADMNISTRATIVO", "CONCURSADO (PROBATORIO)", "presente", "crte",
    { funcaoCritica: true, escala: { inicio1: "07:00", fim1: "11:00", inicio2: "13:00", fim2: "17:00", totalHoras: 8 } }),
];

// CRTE - Casa de Apoio
const crteCasaServidores: Servidor[] = [
  srv("crte-ca1", "ALESSANDRA CRISTINA FERREIRA", "16153001", "FARMACEUTICO / BIOQUIMICO", "CRT - CASA DE APOIO", "ADMNISTRATIVO", "CONCURSADO (EFETIVO)", "afastado", "crte",
    { observacao: "Afastada" }),
  srv("crte-ca2", "JESSICA FREIRE FRANCO", "32556001", "TECNICO ADMNISTRATIVO", "CRT - CASA DE APOIO", "ADMNISTRATIVO", "CONTRATO TEMPORARIO", "presente", "crte"),
  srv("crte-ca3", "JOSAN DE MATOS", "11924001", "TECNICO DE RAIO X", "CRT - CASA DE APOIO", "COORDENAÇÃO", "CONCURSADO (EFETIVO)", "presente", "crte",
    { funcaoCritica: true }),
];

// CRTE - Motoristas (subset)
const crteMotoristas: Servidor[] = [
  srv("crte-m1", "AGOSTINHO DE SOUZA VARGAS", "5600001", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "presente", "crte",
    { ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", totalDias: 0, feriasVencidas: 1 } }),
  srv("crte-m2", "ANIS SOUZA", "5723001", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "ferias", "crte",
    { ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", periodo1Inicio: "02/02/2026", periodo1Fim: "03/03/2026", totalDias: 30, feriasVencidas: 1 } }),
  srv("crte-m3", "ANTONIO AUGUSTO ALVES DE PAULA", "31702001", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "presente", "crte",
    { escala: { inicio1: "12:00", fim1: "18:00", totalHoras: 6 } }),
  srv("crte-m4", "EDSON JUSTINO DE SOUZA", "2926002", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "afastado", "crte",
    { observacao: "Afastamento", escala: { inicio1: "12:00", fim1: "18:00", totalHoras: 6 } }),
  srv("crte-m5", "DOUGLAS FERREIRA DA SILVA", "17666001", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "presente", "crte",
    { ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", periodo1Inicio: "12/03/2026", periodo1Fim: "10/04/2026", totalDias: 30, feriasVencidas: 1 } }),
  srv("crte-m6", "FAUSE WILLIAN DE OLIVEIRA", "17667001", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "presente", "crte",
    { observacao: "Redução de Carga Horaria", escala: { inicio1: "07:00", fim1: "11:00", inicio2: "13:00", fim2: "17:00", totalHoras: 8 }, ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", totalDias: 0, feriasVencidas: 1 } }),
  srv("crte-m7", "JULIO CESAR DE SOUZA", "17664001", "MOTORISTA", "CRT - FROTAS", "", "CONCURSADO (EFETIVO)", "ferias", "crte",
    { ferias: { statusGerencial: "SEM ANO DE REFERÊNCIA", periodo1Inicio: "05/01/2026", periodo1Fim: "04/02/2026", totalDias: 31 } }),
  srv("crte-m8", "REGIANI CAVALCANTE DA SILVA", "30188001", "MOTORISTA", "CRT - FROTAS", "", "CONTRATO TEMPORARIO", "presente", "crte",
    { escala: { inicio1: "07:00", fim1: "11:00", inicio2: "13:00", fim2: "17:00", totalHoras: 8 } }),
];

// Build coordenações
const craCoordenacao: Coordenacao = {
  id: "coord-cra",
  nome: "CRA - Coordenação",
  unidadeId: "cra",
  coordenador: craCoordServidores[0],
  servidores: craCoordServidores,
};

const craServidoresCoordenacao: Coordenacao = {
  id: "coord-cra-srv",
  nome: "CRA - Servidores",
  unidadeId: "cra",
  servidores: craServidores,
};

const crteCoordenacao: Coordenacao = {
  id: "coord-crte",
  nome: "CRTE - Coordenação",
  unidadeId: "crte",
  coordenador: crteCoordServidor,
  servidores: [crteCoordServidor],
};

const crteSocialCoordenacao: Coordenacao = {
  id: "coord-crte-social",
  nome: "CRTE - Setor Social",
  unidadeId: "crte",
  servidores: crteSocialServidores,
};

const crteCasaCoordenacao: Coordenacao = {
  id: "coord-crte-casa",
  nome: "CRTE - Casa de Apoio CG/MS",
  unidadeId: "crte",
  servidores: crteCasaServidores,
};

const crteMotoristasCoordenacao: Coordenacao = {
  id: "coord-crte-motoristas",
  nome: "CRTE - Motoristas",
  unidadeId: "crte",
  servidores: crteMotoristas,
};

// Build unidades
const unidadeCRA: Unidade = {
  id: "cra",
  nome: "Central de Regulação Ambulatorial",
  sigla: "CRA",
  diretoriaId: "dir-complexo-regulador",
  coordenacoes: [craCoordenacao, craServidoresCoordenacao],
};

const unidadeCRTE: Unidade = {
  id: "crte",
  nome: "Central de Regulação de Transportes Eletivos",
  sigla: "CRTE",
  diretoriaId: "dir-complexo-regulador",
  coordenacoes: [crteCoordenacao, crteSocialCoordenacao, crteCasaCoordenacao, crteMotoristasCoordenacao],
};

// Build diretoria
export const diretoriaComplexoRegulador: Diretoria = {
  id: "dir-complexo-regulador",
  nome: "Diretoria Complexo Regulador",
  diretor: directorServidor,
  unidades: [unidadeCRA, unidadeCRTE],
};

export const diretorias: Diretoria[] = [diretoriaComplexoRegulador];

// Helper to get all servidores
export function getAllServidores(): Servidor[] {
  const all: Servidor[] = [];
  for (const dir of diretorias) {
    if (dir.diretor) all.push(dir.diretor);
    for (const uni of dir.unidades) {
      for (const coord of uni.coordenacoes) {
        all.push(...coord.servidores);
      }
    }
  }
  return all;
}

export function getStats() {
  const servidores = getAllServidores();
  const total = servidores.length;
  const presentes = servidores.filter(s => s.statusPresenca === "presente").length;
  const ferias = servidores.filter(s => s.statusPresenca === "ferias").length;
  const afastados = servidores.filter(s => s.statusPresenca === "afastado").length;
  const ausentes = servidores.filter(s => s.statusPresenca === "ausente").length;
  const funcoesCriticas = servidores.filter(s => s.funcaoCritica).length;
  const concursados = servidores.filter(s => s.vinculo.includes("CONCURSADO")).length;
  const contratados = servidores.filter(s => s.vinculo.includes("CONTRATO")).length;

  return { total, presentes, ferias, afastados, ausentes, funcoesCriticas, concursados, contratados };
}
