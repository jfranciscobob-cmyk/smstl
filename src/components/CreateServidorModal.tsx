import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiretoriaDB, UnidadeDB, CoordenacaoDB } from "@/hooks/useServidores";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Save, Loader2, UserPlus, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface CreateServidorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  diretorias: DiretoriaDB[];
  unidades: UnidadeDB[];
  coordenacoes: CoordenacaoDB[];
  defaultDiretoriaId?: string;
  defaultUnidadeId?: string;
  defaultCoordenacaoId?: string;
}

const initialForm = {
  nome: "",
  cargo: "",
  matricula: "",
  vinculo: "",
  local_trabalho: "",
  setor: "",
  status_presenca: "presente",
  diretoria_id: "",
  unidade_id: "",
  coordenacao_id: "",
  funcao_critica: false,
  cobertura_prevista: "PARCIAL",
  escala_inicio1: "",
  escala_fim1: "",
  escala_inicio2: "",
  escala_fim2: "",
  escala_total_horas: "",
  ferias_status_gerencial: "",
  ferias_periodo1_inicio: "",
  ferias_periodo1_fim: "",
  ferias_periodo2_inicio: "",
  ferias_periodo2_fim: "",
  ferias_total_dias: "",
  ferias_vencidas: "",
  observacao: "",
  is_diretor: false,
  is_coordenador: false,
};

export function CreateServidorModal({
  open, onClose, onSaved, diretorias, unidades, coordenacoes,
  defaultDiretoriaId, defaultUnidadeId, defaultCoordenacaoId,
}: CreateServidorModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ...initialForm,
    diretoria_id: defaultDiretoriaId || "",
    unidade_id: defaultUnidadeId || "",
    coordenacao_id: defaultCoordenacaoId || "",
  });

  // Reset form when modal opens with new defaults
  const resetForm = () => setForm({
    ...initialForm,
    diretoria_id: defaultDiretoriaId || "",
    unidade_id: defaultUnidadeId || "",
    coordenacao_id: defaultCoordenacaoId || "",
  });

  const filteredUnidades = unidades.filter(u => !form.diretoria_id || u.diretoria_id === form.diretoria_id);
  const filteredCoordenacoes = coordenacoes.filter(c => !form.unidade_id || c.unidade_id === form.unidade_id);

  const handleSave = async () => {
    if (!form.nome.trim() || !form.matricula.trim() || !form.cargo.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome, matrícula e cargo são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("servidores").insert({
      nome: form.nome.trim(),
      cargo: form.cargo.trim(),
      matricula: form.matricula.trim(),
      vinculo: form.vinculo || "CONCURSADO (EFETIVO)",
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
    });

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Servidor criado!", description: `${form.nome} foi cadastrado com sucesso.` });
      resetForm();
      onSaved();
      onClose();
    }
  };

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Servidor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Informações Básicas */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Informações Básicas *</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nome *</label>
                <input className={inputClass} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <label className={labelClass}>Matrícula *</label>
                <input className={inputClass} value={form.matricula} onChange={e => set("matricula", e.target.value)} placeholder="Número da matrícula" />
              </div>
              <div>
                <label className={labelClass}>Cargo *</label>
                <input className={inputClass} value={form.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Ex: Enfermeiro" />
              </div>
              <div>
                <label className={labelClass}>Vínculo</label>
                <select className={selectClass} value={form.vinculo} onChange={e => set("vinculo", e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="CONCURSADO (EFETIVO)">Concursado (Efetivo)</option>
                  <option value="CONTRATO TEMPORARIO">Contrato Temporário</option>
                  <option value="COMISSIONADO">Comissionado</option>
                  <option value="CLT">CLT</option>
                  <option value="AGENTE POLITICO">Agente Político</option>
                </select>
              </div>
            </div>
          </section>

          {/* Lotação */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Lotação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Diretoria</label>
                <select className={selectClass} value={form.diretoria_id} onChange={e => { set("diretoria_id", e.target.value); set("unidade_id", ""); set("coordenacao_id", ""); }}>
                  <option value="">— Sem diretoria —</option>
                  {diretorias.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Unidade</label>
                <select className={selectClass} value={form.unidade_id} onChange={e => { set("unidade_id", e.target.value); set("coordenacao_id", ""); }}>
                  <option value="">— Sem unidade —</option>
                  {filteredUnidades.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Coordenação</label>
                <select className={selectClass} value={form.coordenacao_id} onChange={e => set("coordenacao_id", e.target.value)}>
                  <option value="">— Sem coordenação —</option>
                  {filteredCoordenacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Local de Trabalho</label>
                <input className={inputClass} value={form.local_trabalho} onChange={e => set("local_trabalho", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Setor</label>
                <input className={inputClass} value={form.setor} onChange={e => set("setor", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Status de Presença</label>
                <select className={selectClass} value={form.status_presenca} onChange={e => set("status_presenca", e.target.value)}>
                  <option value="presente">Presente</option>
                  <option value="ausente">Ausente</option>
                  <option value="ferias">Férias</option>
                  <option value="afastado">Afastado</option>
                  <option value="licenca">Licença</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Cobertura Prevista</label>
                <select className={selectClass} value={form.cobertura_prevista} onChange={e => set("cobertura_prevista", e.target.value)}>
                  <option value="PARCIAL">Parcial</option>
                  <option value="INTEGRAL">Integral</option>
                  <option value="SEM COBERTURA">Sem Cobertura</option>
                </select>
              </div>
            </div>
          </section>

          {/* Escala */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Escala de Trabalho</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className={labelClass}>Entrada 1</label><input type="time" className={inputClass} value={form.escala_inicio1} onChange={e => set("escala_inicio1", e.target.value)} /></div>
              <div><label className={labelClass}>Saída 1</label><input type="time" className={inputClass} value={form.escala_fim1} onChange={e => set("escala_fim1", e.target.value)} /></div>
              <div><label className={labelClass}>Entrada 2</label><input type="time" className={inputClass} value={form.escala_inicio2} onChange={e => set("escala_inicio2", e.target.value)} /></div>
              <div><label className={labelClass}>Saída 2</label><input type="time" className={inputClass} value={form.escala_fim2} onChange={e => set("escala_fim2", e.target.value)} /></div>
            </div>
            <div className="mt-3 max-w-[200px]">
              <label className={labelClass}>Total Horas/Dia</label>
              <input type="number" className={inputClass} value={form.escala_total_horas} onChange={e => set("escala_total_horas", e.target.value)} placeholder="Ex: 8" />
            </div>
          </section>

          {/* Observação */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Observações</h3>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
              value={form.observacao}
              onChange={e => set("observacao", e.target.value)}
              placeholder="Atestado, observações gerais..."
            />
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button onClick={() => { resetForm(); onClose(); }} className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
