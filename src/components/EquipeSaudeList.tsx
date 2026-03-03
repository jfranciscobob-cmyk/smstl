import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2, Check, X, Users, Heart, UserPlus, Crown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { ServidorDB } from "@/hooks/useServidores";

interface EquipeSaude {
  id: string;
  nome: string;
  tipo: string;
  unidade_id: string;
  responsavel_id: string | null;
}

interface ServidorEquipe {
  servidor_id: string;
  equipe_id: string;
}

interface EquipeSaudeListProps {
  equipes: EquipeSaude[];
  servidoresEquipes: ServidorEquipe[];
  servidores: ServidorDB[];
  unidadeId: string;
  contextServidores: ServidorDB[];
  onReload: () => void;
}

const TIPOS_EQUIPE = ["ESF", "eAP", "NASF", "eSB", "eSF", "EMAD", "EMAP", "Outro"];

export function EquipeSaudeList({ equipes, servidoresEquipes, servidores, unidadeId, contextServidores, onReload }: EquipeSaudeListProps) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newTipo, setNewTipo] = useState("ESF");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [assigningEquipeId, setAssigningEquipeId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
  const [pickingResponsavel, setPickingResponsavel] = useState<string | null>(null);
  const [respSearch, setRespSearch] = useState("");
  const [expandedEquipes, setExpandedEquipes] = useState<Set<string>>(new Set());

  const addEquipe = async () => {
    if (!newNome.trim()) return;
    const { error } = await supabase.from("equipes_saude").insert({
      nome: newNome.trim(),
      tipo: newTipo,
      unidade_id: unidadeId,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Equipe de saúde criada!" });
    setNewNome("");
    setNewTipo("ESF");
    setAdding(false);
    onReload();
  };

  const deleteEquipe = async (id: string) => {
    await supabase.from("equipes_saude").delete().eq("id", id);
    toast({ title: "Equipe removida" });
    onReload();
  };

  const saveEdit = async (id: string) => {
    if (!editNome.trim()) return;
    await supabase.from("equipes_saude").update({ nome: editNome.trim(), tipo: editTipo }).eq("id", id);
    setEditingId(null);
    toast({ title: "Equipe atualizada!" });
    onReload();
  };

  const assignServidores = async (equipeId: string) => {
    if (assignSelectedIds.size === 0) return;
    const ids = Array.from(assignSelectedIds);
    
    // Check existing
    const { data: existentes } = await supabase
      .from("servidores_equipes")
      .select("servidor_id")
      .eq("equipe_id", equipeId)
      .in("servidor_id", ids);
    
    const existentesSet = new Set((existentes ?? []).map(r => r.servidor_id));
    const payload = ids.filter(id => !existentesSet.has(id)).map(servidor_id => ({ servidor_id, equipe_id: equipeId }));
    
    if (payload.length === 0) {
      toast({ title: "Nenhuma alteração", description: "Servidores já estavam na equipe." });
      return;
    }

    const { error } = await supabase.from("servidores_equipes").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${payload.length} servidor(es) adicionado(s) à equipe!` });
    setAssigningEquipeId(null);
    setAssignSearch("");
    setAssignSelectedIds(new Set());
    onReload();
  };

  const removeFromEquipe = async (servidorId: string, equipeId: string) => {
    await supabase.from("servidores_equipes").delete().eq("servidor_id", servidorId).eq("equipe_id", equipeId);
    toast({ title: "Servidor removido da equipe" });
    onReload();
  };

  const setResponsavel = async (equipeId: string, servidorId: string) => {
    await supabase.from("equipes_saude").update({ responsavel_id: servidorId }).eq("id", equipeId);
    toast({ title: "Responsável definido!" });
    setPickingResponsavel(null);
    setRespSearch("");
    onReload();
  };

  const removeResponsavel = async (equipeId: string) => {
    await supabase.from("equipes_saude").update({ responsavel_id: null }).eq("id", equipeId);
    toast({ title: "Responsável removido" });
    onReload();
  };

  const getMembers = (equipeId: string) => {
    const memberIds = servidoresEquipes.filter(se => se.equipe_id === equipeId).map(se => se.servidor_id);
    return memberIds.map(id => servidores.find(s => s.id === id)).filter(Boolean) as ServidorDB[];
  };

  const filteredAssign = assignSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(assignSearch.toLowerCase()) || s.matricula.includes(assignSearch)).slice(0, 15)
    : contextServidores.slice(0, 15);

  const filteredResp = respSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(respSearch.toLowerCase()) || s.matricula.includes(respSearch)).slice(0, 8)
    : contextServidores.slice(0, 8);

  const unidadeEquipes = equipes.filter(e => e.unidade_id === unidadeId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Equipes de Saúde ({unidadeEquipes.length})
          </span>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-rose-600 font-medium hover:text-rose-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Nova equipe
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 items-center bg-rose-50 dark:bg-rose-950/20 rounded-lg p-3">
          <input
            autoFocus
            value={newNome}
            onChange={e => setNewNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addEquipe()}
            placeholder="Nome da equipe (ex: Equipe SF 01)..."
            className="flex-1 h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <select
            value={newTipo}
            onChange={e => setNewTipo(e.target.value)}
            className="h-8 rounded border border-input bg-card px-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          >
            {TIPOS_EQUIPE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={addEquipe} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-500 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Criar
          </button>
          <button onClick={() => { setAdding(false); setNewNome(""); }} className="text-xs text-muted-foreground">Cancelar</button>
        </div>
      )}

      {unidadeEquipes.map(equipe => {
        const members = getMembers(equipe.id);
        const responsavel = equipe.responsavel_id ? servidores.find(s => s.id === equipe.responsavel_id) : null;
        const isExpanded = expandedEquipes.has(equipe.id);

        return (
          <div key={equipe.id} className="border border-rose-200 dark:border-rose-900/30 rounded-lg overflow-hidden bg-rose-50/30 dark:bg-rose-950/10">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setExpandedEquipes(prev => {
                  const next = new Set(prev);
                  if (next.has(equipe.id)) next.delete(equipe.id); else next.add(equipe.id);
                  return next;
                })}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                {editingId === equipe.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit(equipe.id)}
                      className="h-6 rounded border border-input bg-card px-2 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                    <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className="h-6 rounded border border-input bg-card px-1 text-xs">
                      {TIPOS_EQUIPE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => saveEdit(equipe.id)} className="text-primary"><Check className="h-3 w-3" /></button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{equipe.nome}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">{equipe.tipo}</span>
                    <span className="text-xs text-muted-foreground">({members.length} membros)</span>
                  </div>
                )}
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAssigningEquipeId(equipe.id)}
                  className="p-1 rounded text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors" title="Adicionar membros"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setEditingId(equipe.id); setEditNome(equipe.nome); setEditTipo(equipe.tipo); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteEquipe(equipe.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Responsável */}
            {isExpanded && (
              <div className="px-3 py-1.5 border-t border-rose-200/50 dark:border-rose-900/20 flex items-center gap-2 flex-wrap">
                <Crown className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável:</span>
                {responsavel ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">{responsavel.nome}</span>
                    <button onClick={() => removeResponsavel(equipe.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : pickingResponsavel === equipe.id ? (
                  <div className="flex-1 max-w-xs space-y-1">
                    <input
                      autoFocus
                      value={respSearch}
                      onChange={e => setRespSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full h-6 rounded border border-input bg-card px-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                    <div className="max-h-28 overflow-y-auto bg-card rounded border border-border shadow-md">
                      {filteredResp.map(s => (
                        <button key={s.id} onClick={() => setResponsavel(equipe.id, s.id)} className="w-full text-left px-2 py-1 text-[11px] hover:bg-primary/10 text-foreground">
                          {s.nome} <span className="text-muted-foreground">({s.matricula})</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setPickingResponsavel(null); setRespSearch(""); }} className="text-[10px] text-muted-foreground">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setPickingResponsavel(equipe.id)} className="text-[10px] text-rose-600 font-medium hover:text-rose-500">
                    + Definir
                  </button>
                )}
              </div>
            )}

            {/* Assign to equipe */}
            {assigningEquipeId === equipe.id && (
              <div className="px-3 py-2 border-t border-rose-200/50 dark:border-rose-900/20 space-y-2">
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Buscar servidor..."
                  className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                />
                <div className="max-h-40 overflow-y-auto bg-card rounded border border-border shadow-md">
                  {filteredAssign.map(s => (
                    <label key={s.id} className="flex items-center gap-2 w-full px-2 py-1 text-xs hover:bg-primary/10 text-foreground cursor-pointer">
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
                      {members.some(m => m.id === s.id) && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-600">já na equipe</span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {assignSelectedIds.size > 0 && (
                    <button
                      onClick={() => assignServidores(equipe.id)}
                      className="flex items-center gap-1 h-6 px-3 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-500 transition-colors"
                    >
                      <Check className="h-3 w-3" /> Adicionar {assignSelectedIds.size}
                    </button>
                  )}
                  <button onClick={() => { setAssigningEquipeId(null); setAssignSearch(""); setAssignSelectedIds(new Set()); }} className="text-xs text-muted-foreground">Cancelar</button>
                </div>
              </div>
            )}

            {/* Members list */}
            {isExpanded && members.length > 0 && (
              <div className="border-t border-rose-200/50 dark:border-rose-900/20">
                <div className="divide-y divide-border/30">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{m.nome}</span>
                        <span className="text-muted-foreground">{m.cargo}</span>
                        {m.vinculo === "ESTAGIARIO" && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">🎓 Estágio</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromEquipe(m.id, equipe.id)}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                        title="Remover da equipe"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isExpanded && members.length === 0 && (
              <div className="px-3 py-3 border-t border-rose-200/50 dark:border-rose-900/20 text-center">
                <p className="text-xs text-muted-foreground">Nenhum membro. Clique em <UserPlus className="inline h-3 w-3" /> para adicionar.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
