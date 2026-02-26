import { useState } from "react";
import type { ServidorDB, FuncaoDB } from "@/hooks/useServidores";
import {
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, Users, X, Check
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface FuncaoListProps {
  funcoes: FuncaoDB[];
  servidores: ServidorDB[];
  unidadeId: string;
  onAddFuncao: (nome: string, unidadeId: string) => void;
  onDeleteFuncao: (id: string) => void;
  onAssignServidor: (servidorIds: string[], funcaoId: string) => void;
  contextServidores: ServidorDB[];
}

export function FuncaoList({
  funcoes,
  servidores,
  unidadeId,
  onAddFuncao,
  onDeleteFuncao,
  onAssignServidor,
  contextServidores,
}: FuncaoListProps) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [expandedFuncoes, setExpandedFuncoes] = useState<Record<string, boolean>>({});
  const [assigningFuncaoId, setAssigningFuncaoId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => setExpandedFuncoes(prev => ({ ...prev, [id]: !prev[id] }));

  const getServidoresInFuncao = (funcaoId: string) =>
    servidores.filter(s => (s as any).funcao_id === funcaoId);

  const filteredAssign = assignSearch.length >= 2
    ? contextServidores.filter(s => s.nome.toLowerCase().includes(assignSearch.toLowerCase()) || s.matricula.includes(assignSearch)).slice(0, 30)
    : contextServidores.slice(0, 30);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (!nome.trim()) return;
    onAddFuncao(nome.trim(), unidadeId);
    setNome("");
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5" /> Funções ({funcoes.length})
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Nova função
        </button>
      </div>

      {showForm && (
        <div className="flex gap-2 items-center bg-muted/30 rounded-lg p-3">
          <input
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Ex: Médicos Reguladores, Administrativo..."
            className="flex-1 h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <button onClick={handleAdd} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Criar
          </button>
          <button onClick={() => setShowForm(false)} className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {funcoes.map(funcao => {
        const funcaoServidores = getServidoresInFuncao(funcao.id);
        const isExpanded = expandedFuncoes[funcao.id];

        return (
          <div key={funcao.id} className="border border-border/40 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-accent/20">
              <button onClick={() => toggleExpand(funcao.id)} className="flex items-center gap-2 flex-1 text-left">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Briefcase className="h-3.5 w-3.5 text-accent-foreground" />
                <span className="text-xs font-bold text-foreground">{funcao.nome}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">{funcaoServidores.length} servidor(es)</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setAssigningFuncaoId(funcao.id); setSelectedIds(new Set()); }}
                  className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Vincular servidores"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteFuncao(funcao.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir função"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {assigningFuncaoId === funcao.id && (
              <div className="px-3 py-2 border-t border-border/20 space-y-2">
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Buscar servidor..."
                  className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                />
                <div className="max-h-48 overflow-y-auto bg-card rounded border border-border shadow-md">
                  {filteredAssign.map(s => (
                    <label key={s.id} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-primary/10 text-foreground cursor-pointer">
                      <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-muted-foreground">({s.cargo})</span>
                    </label>
                  ))}
                  {filteredAssign.length === 0 && (
                    <p className="text-[10px] text-muted-foreground py-2 px-2">Nenhum servidor encontrado.</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => {
                        onAssignServidor(Array.from(selectedIds), funcao.id);
                        setSelectedIds(new Set());
                        setAssigningFuncaoId(null);
                        setAssignSearch("");
                      }}
                      className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Check className="h-3 w-3" /> Vincular {selectedIds.size}
                    </button>
                  )}
                  <button onClick={() => { setAssigningFuncaoId(null); setAssignSearch(""); setSelectedIds(new Set()); }} className="text-[10px] text-muted-foreground">Cancelar</button>
                </div>
              </div>
            )}

            {isExpanded && funcaoServidores.length > 0 && (
              <div className="border-t border-border/20 divide-y divide-border/10">
                {funcaoServidores.map(s => (
                  <div key={s.id} className="px-3 py-1.5 text-xs text-foreground flex items-center justify-between">
                    <div>
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-muted-foreground ml-2">({s.cargo})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isExpanded && funcaoServidores.length === 0 && (
              <div className="border-t border-border/20 px-3 py-2 text-[10px] text-muted-foreground italic">
                Nenhum servidor vinculado a esta função.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
