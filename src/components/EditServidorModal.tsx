import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServidorDB, DiretoriaDB, UnidadeDB, CoordenacaoDB } from "@/hooks/useServidores";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { X, Save, Loader2, AlertTriangle, Link2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface EditServidorModalProps {
  servidor: ServidorDB | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  diretorias: DiretoriaDB[];
  unidades: UnidadeDB[];
  coordenacoes: CoordenacaoDB[];
}

export function EditServidorModal({
  servidor,
  open,
  onClose,
  onSaved,
  diretorias,
  unidades,
  coordenacoes,
}: EditServidorModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [extraUnidadeIds, setExtraUnidadeIds] = useState<string[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    cargo: "",
    matricula: "",
    vinculo: "",
    local_trabalho: "",
    setor: "",
    status_presenca: "presente",
    diretoria_id: "" as string,
    unidade_id: "" as string,
    coordenacao_id: "" as string,
    funcao_critica: false,
    cobertura_prevista: "PARCIAL",
    escala_inicio1: "",
    escala_fim1: "",
    escala_inicio2: "",
    escala_fim2: "",
    escala_total_horas: "" as string,
    ferias_status_gerencial: "",
    ferias_periodo1_inicio: "",
    ferias_periodo1_fim: "",
    ferias_periodo2_inicio: "",
    ferias_periodo2_fim: "",
    ferias_total_dias: "" as string,
    ferias_vencidas: "" as string,
    observacao: "",
    data_admissao: "",
    data_encerramento_contrato: "",
    tipo_escala: "fixa",
    is_diretor: false,
    is_coordenador: false,
    is_coordenador_medico: false,
    vinculo2: "",
    duplo_vinculo: false,
  });

  const loadExtraUnidades = useCallback(async (servId: string) => {
    setLoadingExtras(true);
    const { data } = await supabase
      .from("servidores_unidades")
      .select("unidade_id")
      .eq("servidor_id", servId);
    setExtraUnidadeIds((data ?? []).map(d => d.unidade_id));
    setLoadingExtras(false);
  }, []);

  useEffect(() => {
    if (servidor) {
      setForm({
        nome: servidor.nome,
        cargo: servidor.cargo,
        matricula: servidor.matricula,
        vinculo: servidor.vinculo,
        local_trabalho: servidor.local_trabalho,
        setor: servidor.setor,
        status_presenca: servidor.status_presenca,
        diretoria_id: servidor.diretoria_id || "",
        unidade_id: servidor.unidade_id || "",
        coordenacao_id: servidor.coordenacao_id || "",
        funcao_critica: servidor.funcao_critica,
        cobertura_prevista: servidor.cobertura_prevista,
        escala_inicio1: servidor.escala_inicio1 || "",
        escala_fim1: servidor.escala_fim1 || "",
        escala_inicio2: servidor.escala_inicio2 || "",
        escala_fim2: servidor.escala_fim2 || "",
        escala_total_horas: servidor.escala_total_horas?.toString() || "",
        ferias_status_gerencial: servidor.ferias_status_gerencial || "",
        ferias_periodo1_inicio: servidor.ferias_periodo1_inicio || "",
        ferias_periodo1_fim: servidor.ferias_periodo1_fim || "",
        ferias_periodo2_inicio: servidor.ferias_periodo2_inicio || "",
        ferias_periodo2_fim: servidor.ferias_periodo2_fim || "",
        ferias_total_dias: servidor.ferias_total_dias?.toString() || "",
        ferias_vencidas: servidor.ferias_vencidas?.toString() || "",
        observacao: servidor.observacao || "",
        data_admissao: servidor.data_admissao || "",
        data_encerramento_contrato: servidor.data_encerramento_contrato || "",
        tipo_escala: servidor.tipo_escala || "fixa",
        is_diretor: servidor.is_diretor,
        is_coordenador: servidor.is_coordenador,
        is_coordenador_medico: (servidor as any).is_coordenador_medico || false,
        vinculo2: (servidor as any).vinculo2 || "",
        duplo_vinculo: (servidor as any).duplo_vinculo || false,
      });
      loadExtraUnidades(servidor.id);
    }
  }, [servidor, loadExtraUnidades]);

  const filteredUnidades = unidades.filter(
    (u) => !form.diretoria_id || u.diretoria_id === form.diretoria_id
  );
  const filteredCoordenacoes = coordenacoes.filter(
    (c) => !form.unidade_id || c.unidade_id === form.unidade_id
  );

  const handleSave = async () => {
    if (!servidor) return;
    setSaving(true);

    const updateData = {
      nome: form.nome,
      cargo: form.cargo,
      matricula: form.matricula,
      vinculo: form.vinculo,
      local_trabalho: form.local_trabalho,
      setor: form.setor,
      status_presenca: form.status_presenca,
      diretoria_id: form.diretoria_id || null,
      unidade_id: form.unidade_id || null,
      coordenacao_id: form.coordenacao_id || null,
      funcao_critica: form.funcao_critica,
      cobertura_prevista: form.cobertura_prevista,
      escala_inicio1: form.escala_inicio1 || null,
      escala_fim1: form.escala_fim1 || null,
      escala_inicio2: form.escala_inicio2 || null,
      escala_fim2: form.escala_fim2 || null,
      escala_total_horas: form.escala_total_horas ? parseInt(form.escala_total_horas) : null,
      ferias_status_gerencial: form.ferias_status_gerencial || null,
      ferias_periodo1_inicio: form.ferias_periodo1_inicio || null,
      ferias_periodo1_fim: form.ferias_periodo1_fim || null,
      ferias_periodo2_inicio: form.ferias_periodo2_inicio || null,
      ferias_periodo2_fim: form.ferias_periodo2_fim || null,
      ferias_total_dias: form.ferias_total_dias ? parseInt(form.ferias_total_dias) : null,
      ferias_vencidas: form.ferias_vencidas ? parseInt(form.ferias_vencidas) : null,
      observacao: form.observacao || null,
      is_diretor: form.is_diretor,
      is_coordenador: form.is_coordenador,
      is_coordenador_medico: form.is_coordenador_medico,
      duplo_vinculo: form.duplo_vinculo,
      vinculo2: form.duplo_vinculo ? (form.vinculo2 || null) : null,
      data_admissao: form.data_admissao || null,
      data_encerramento_contrato: form.data_encerramento_contrato || null,
      tipo_escala: form.tipo_escala,
    };

    const { error } = await supabase
      .from("servidores")
      .update(updateData)
      .eq("id", servidor.id);

    if (error) {
      setSaving(false);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    // Sync extra unidades (junction table)
    await supabase.from("servidores_unidades").delete().eq("servidor_id", servidor.id);
    if (extraUnidadeIds.length > 0) {
      await supabase.from("servidores_unidades").insert(
        extraUnidadeIds.map(uid => ({ servidor_id: servidor.id, unidade_id: uid }))
      );
    }

    setSaving(false);
    toast({ title: "Servidor atualizado!", description: `${form.nome} foi atualizado com sucesso.` });
    onSaved();
    onClose();
  };

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Editar Servidor</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Alerta Duplo Vínculo */}
          {servidor?.duplo_vinculo && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
              <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-700 dark:text-amber-300 font-bold">
                ⚡ Duplo Vínculo Identificado
              </AlertTitle>
              <AlertDescription className="text-amber-700/80 dark:text-amber-300/80 space-y-1 mt-1">
                <p className="font-semibold">Vínculo 1: <span className="font-normal">{servidor.vinculo || "Não informado"}</span></p>
                <p className="text-xs">
                  Pasta: {diretorias.find(d => d.id === servidor.diretoria_id)?.nome || "Sem diretoria"} 
                  {servidor.unidade_id && ` → ${unidades.find(u => u.id === servidor.unidade_id)?.nome || ""}`}
                </p>
                {(servidor as any).vinculo2 && (
                  <>
                    <p className="font-semibold mt-2">Vínculo 2: <span className="font-normal">{(servidor as any).vinculo2}</span></p>
                    {extraUnidadeIds.length > 0 ? (
                      <p className="text-xs">
                        Unidades adicionais: {extraUnidadeIds.map(uid => {
                          const u = unidades.find(u => u.id === uid);
                          const d = u ? diretorias.find(d => d.id === u.diretoria_id) : null;
                          return u ? `${d?.nome || "?"} → ${u.nome}` : uid;
                        }).join("; ")}
                      </p>
                    ) : (
                      <p className="text-xs italic">Nenhuma unidade adicional vinculada ao segundo vínculo.</p>
                    )}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">
              Informações Básicas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nome</label>
                <input className={inputClass} value={form.nome} onChange={(e) => set("nome", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Matrícula</label>
                <input className={inputClass} value={form.matricula} onChange={(e) => set("matricula", e.target.value)} placeholder="Número da matrícula" />
              </div>
              <div>
                <label className={labelClass}>Cargo</label>
                <input className={inputClass} value={form.cargo} onChange={(e) => set("cargo", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Vínculo</label>
                <select className={selectClass} value={form.vinculo} onChange={(e) => set("vinculo", e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="CONCURSADO (EFETIVO)">Concursado (Efetivo)</option>
                  <option value="CONTRATO TEMPORARIO">Contrato Temporário</option>
                  <option value="COMISSIONADO">Comissionado</option>
                  <option value="CLT">CLT</option>
                  <option value="AGENTE POLITICO">Agente Político</option>
                  <option value="ESTAGIARIO">Estagiário</option>
                </select>
              </div>
              {form.duplo_vinculo && (
                <div>
                  <label className={labelClass}>Vínculo 2 <span className="text-amber-500 font-semibold">⚡ DUPLO VÍNCULO</span></label>
                  <select className={selectClass} value={form.vinculo2} onChange={(e) => set("vinculo2", e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="CONCURSADO (EFETIVO)">Concursado (Efetivo)</option>
                    <option value="CONTRATO TEMPORARIO">Contrato Temporário</option>
                    <option value="COMISSIONADO">Comissionado</option>
                    <option value="CLT">CLT</option>
                    <option value="AGENTE POLITICO">Agente Político</option>
                    <option value="ESTAGIARIO">Estagiário</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Data de Admissão {form.vinculo === "ESTAGIARIO" ? "*" : ""}</label>
                <input type="date" className={inputClass} value={form.data_admissao} onChange={(e) => set("data_admissao", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Data Encerramento Contrato {(form.vinculo === "CONTRATO TEMPORARIO" || form.vinculo === "ESTAGIARIO") ? "*" : ""}</label>
                <input type="date" className={inputClass} value={form.data_encerramento_contrato} onChange={(e) => set("data_encerramento_contrato", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.duplo_vinculo} onChange={(e) => set("duplo_vinculo", e.target.checked)} className="rounded border-input" />
                  Duplo Vínculo
                </label>
              </div>
            </div>
            {form.vinculo === "ESTAGIARIO" && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-violet-100 dark:bg-violet-900/40 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700">
                🎓 ESTÁGIO — Este servidor é estagiário
              </div>
            )}
            {(form.vinculo === "CONTRATO TEMPORARIO" || form.vinculo === "ESTAGIARIO") && !form.data_encerramento_contrato && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  {form.vinculo === "ESTAGIARIO"
                    ? "Estagiário requer data de início e encerramento do contrato."
                    : "Contrato temporário requer data de encerramento para monitoramento."}
                </AlertDescription>
              </Alert>
            )}
            {form.vinculo === "ESTAGIARIO" && !form.data_admissao && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>Informe a data de início do estágio.</AlertDescription>
              </Alert>
            )}
          </section>

          {/* Lotação */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">
              Lotação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Diretoria</label>
                <select className={selectClass} value={form.diretoria_id} onChange={(e) => { set("diretoria_id", e.target.value); set("unidade_id", ""); set("coordenacao_id", ""); }}>
                  <option value="">— Sem diretoria —</option>
                  {diretorias.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Unidade Principal</label>
                <select className={selectClass} value={form.unidade_id} onChange={(e) => { set("unidade_id", e.target.value); set("coordenacao_id", ""); }}>
                  <option value="">— Sem unidade —</option>
                  {filteredUnidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Unidades Adicionais (múltiplas)</label>
                <div className="border border-input rounded-md bg-background p-2 max-h-32 overflow-y-auto space-y-1">
                  {unidades
                    .filter(u => u.id !== form.unidade_id)
                    .map(u => {
                      const checked = extraUnidadeIds.includes(u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setExtraUnidadeIds(prev =>
                                checked ? prev.filter(id => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className="rounded border-input h-3.5 w-3.5"
                          />
                          {u.nome} ({u.sigla})
                          <span className="text-muted-foreground/60 ml-auto">{diretorias.find(d => d.id === u.diretoria_id)?.nome}</span>
                        </label>
                      );
                    })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Marque as unidades adicionais onde este servidor também atua.
                </p>
              </div>
              <div>
                <label className={labelClass}>Coordenação</label>
                <select className={selectClass} value={form.coordenacao_id} onChange={(e) => set("coordenacao_id", e.target.value)}>
                  <option value="">— Sem coordenação —</option>
                  {filteredCoordenacoes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Local de Trabalho</label>
                <input className={inputClass} value={form.local_trabalho} onChange={(e) => set("local_trabalho", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Setor</label>
                <input className={inputClass} value={form.setor} onChange={(e) => set("setor", e.target.value)} />
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.is_diretor} onChange={(e) => set("is_diretor", e.target.checked)} className="rounded border-input" />
                Diretor(a)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.is_coordenador} onChange={(e) => set("is_coordenador", e.target.checked)} className="rounded border-input" />
                Coordenador(a)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.is_coordenador_medico} onChange={(e) => set("is_coordenador_medico", e.target.checked)} className="rounded border-input" />
                Coordenador(a) Médico(a)
              </label>
            </div>
          </section>

          {/* Status e Presença */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">
              Status e Presença
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Status de Presença</label>
                <select className={selectClass} value={form.status_presenca} onChange={(e) => set("status_presenca", e.target.value)}>
                  <option value="presente">Presente</option>
                  <option value="ausente">Ausente</option>
                  <option value="ferias">Férias</option>
                  <option value="afastado">Afastado</option>
                  <option value="licenca">Licença</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Cobertura Prevista</label>
                <select className={selectClass} value={form.cobertura_prevista} onChange={(e) => set("cobertura_prevista", e.target.value)}>
                  <option value="PARCIAL">Parcial</option>
                  <option value="INTEGRAL">Integral</option>
                  <option value="SEM COBERTURA">Sem Cobertura</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.funcao_critica} onChange={(e) => set("funcao_critica", e.target.checked)} className="rounded border-input" />
                  Função Crítica (necessita cobertura obrigatória)
                </label>
              </div>
            </div>
          </section>

          {/* Escala de Trabalho */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">
              Escala de Trabalho
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Tipo de Escala</label>
                <select className={selectClass} value={form.tipo_escala} onChange={(e) => set("tipo_escala", e.target.value)}>
                  <option value="fixa">Fixa (horário comercial)</option>
                  <option value="plantao_12x36">Plantão 12x36</option>
                  <option value="plantao_24x72">Plantão 24x72</option>
                  <option value="plantao_12x60">Plantão 12x60</option>
                  <option value="variavel">Variável (por dia)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>Entrada 1</label>
                <input type="time" className={inputClass} value={form.escala_inicio1} onChange={(e) => set("escala_inicio1", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Saída 1</label>
                <input type="time" className={inputClass} value={form.escala_fim1} onChange={(e) => set("escala_fim1", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Entrada 2</label>
                <input type="time" className={inputClass} value={form.escala_inicio2} onChange={(e) => set("escala_inicio2", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Saída 2</label>
                <input type="time" className={inputClass} value={form.escala_fim2} onChange={(e) => set("escala_fim2", e.target.value)} />
              </div>
            </div>
            <div className="mt-3 max-w-[200px]">
              <label className={labelClass}>Total Horas/Dia</label>
              <input type="number" className={inputClass} value={form.escala_total_horas} onChange={(e) => set("escala_total_horas", e.target.value)} placeholder="Ex: 8" />
            </div>
          </section>

          {/* Férias */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">
              Férias
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Status Gerencial</label>
                <select className={selectClass} value={form.ferias_status_gerencial} onChange={(e) => set("ferias_status_gerencial", e.target.value)}>
                  <option value="">— Selecione —</option>
                  <option value="PROGRAMADAS">Programadas</option>
                  <option value="EM GOZO">Em Gozo</option>
                  <option value="CONCLUIDAS">Concluídas</option>
                  <option value="CANCELADAS">Canceladas</option>
                  <option value="SEM ANO DE REFERÊNCIA">Sem Ano de Referência</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Total Dias</label>
                <input type="number" className={inputClass} value={form.ferias_total_dias} onChange={(e) => set("ferias_total_dias", e.target.value)} placeholder="Ex: 30" />
              </div>
              <div>
                <label className={labelClass}>Período 1 — Início</label>
                <input type="date" className={inputClass} value={form.ferias_periodo1_inicio} onChange={(e) => set("ferias_periodo1_inicio", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Período 1 — Fim</label>
                <input type="date" className={inputClass} value={form.ferias_periodo1_fim} onChange={(e) => set("ferias_periodo1_fim", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Período 2 — Início</label>
                <input type="date" className={inputClass} value={form.ferias_periodo2_inicio} onChange={(e) => set("ferias_periodo2_inicio", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Período 2 — Fim</label>
                <input type="date" className={inputClass} value={form.ferias_periodo2_fim} onChange={(e) => set("ferias_periodo2_fim", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Férias Vencidas</label>
                <input type="number" className={inputClass} value={form.ferias_vencidas} onChange={(e) => set("ferias_vencidas", e.target.value)} placeholder="0" />
              </div>
            </div>
          </section>

          {/* Observação */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">
              Observações
            </h3>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              value={form.observacao}
              onChange={(e) => set("observacao", e.target.value)}
              placeholder="Atestado, observações gerais, motivo de afastamento..."
            />
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              onClick={onClose}
              className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
