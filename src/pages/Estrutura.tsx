import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";
import { supabase } from "@/integrations/supabase/client";
import type { DiretoriaDB, UnidadeDB, CoordenacaoDB, ServidorDB } from "@/hooks/useServidores";
import {
  Building2, Plus, Trash2, Edit2, ChevronDown, ChevronRight, ArrowLeft, Loader2, Shield, X, Check, Network, Users, UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { CreateServidorModal } from "@/components/CreateServidorModal";

function EstruturaContent() {
  const { toast } = useToast();
  const [diretorias, setDiretorias] = useState<DiretoriaDB[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDB[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<CoordenacaoDB[]>([]);
  const [servidores, setServidores] = useState<ServidorDB[]>([]);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    const [d, u, c, s] = await Promise.all([
      supabase.from("diretorias").select("*").order("nome"),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("coordenacoes").select("*").order("nome"),
      supabase.from("servidores").select("id, nome, matricula, cargo, diretoria_id, unidade_id, coordenacao_id").order("nome").limit(2000),
    ]);
    setDiretorias((d.data ?? []) as DiretoriaDB[]);
    setUnidades((u.data ?? []) as UnidadeDB[]);
    setCoordenacoes((c.data ?? []) as CoordenacaoDB[]);
    setServidores((s.data ?? []) as ServidorDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
  const assignServidor = async (servidorId: string, diretoriaId: string, unidadeId: string, coordenacaoId?: string) => {
    const updateData: any = { diretoria_id: diretoriaId, unidade_id: unidadeId };
    if (coordenacaoId) updateData.coordenacao_id = coordenacaoId;
    const { error } = await supabase.from("servidores").update(updateData).eq("id", servidorId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Servidor vinculado!" });
    setAssigningTo(null);
    setAssignSearch("");
    loadData();
  };

  const unassignedServidores = servidores.filter(s => !s.unidade_id);
  const getServidoresByUnidade = (unidadeId: string) => servidores.filter(s => s.unidade_id === unidadeId);
  const getServidoresByCoord = (coordId: string) => servidores.filter(s => s.coordenacao_id === coordId);

  const filteredAssignResults = assignSearch.length >= 2
    ? servidores.filter(s => s.nome.toLowerCase().includes(assignSearch.toLowerCase()) || s.matricula.includes(assignSearch)).slice(0, 8)
    : unassignedServidores.slice(0, 8);

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
        {/* Add Diretoria */}
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

        {/* Hierarchy */}
        {diretorias.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhuma diretoria cadastrada</h3>
            <p className="mt-2 text-sm text-muted-foreground">Crie a primeira diretoria acima para começar a montar a hierarquia.</p>
          </div>
        )}

        {diretorias.map(dir => {
          const dirUnidades = unidades.filter(u => u.diretoria_id === dir.id);
          const isExpanded = expanded[dir.id] !== false;

          return (
            <div key={dir.id} className="glass-card rounded-xl overflow-hidden">
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingId(dir.id); setEditingValue(dir.nome); }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Renomear"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteDiretoria(dir.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-4 space-y-3 pt-3">
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

                  {/* Unidades list */}
                  {dirUnidades.map(uni => {
                    const uniCoords = coordenacoes.filter(c => c.unidade_id === uni.id);
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
                                <span className="text-xs text-muted-foreground">({uniCoords.length} coord.)</span>
                                <span className="flex items-center gap-1 text-xs font-medium text-primary ml-2">
                                  <Users className="h-3 w-3" />
                                  {getServidoresByUnidade(uni.id).length} servidores
                                </span>
                              </div>
                            )}
                          </button>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingId(uni.id); setEditingValue(uni.nome); }} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteUnidade(uni.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {uniExpanded && (
                          <div className="px-4 pb-3 pt-2 space-y-2 ml-6">
                            {uniCoords.map(coord => {
                              const coordServs = getServidoresByCoord(coord.id);
                              return (
                              <div key={coord.id} className="rounded bg-muted/20">
                                <div className="flex items-center justify-between py-1.5 px-3">
                                {editingId === coord.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      autoFocus
                                      value={editingValue}
                                      onChange={e => setEditingValue(e.target.value)}
                                      onKeyDown={e => e.key === "Enter" && saveRename("coordenacoes", coord.id)}
                                      className="h-7 rounded border border-input bg-card px-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                    />
                                    <button onClick={() => saveRename("coordenacoes", coord.id)} className="text-primary"><Check className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-foreground">{coord.nome}</span>
                                    <span className="text-xs text-muted-foreground">({coordServs.length})</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setAssigningTo({ type: "coordenacao", id: coord.id, diretoria_id: dir.id })}
                                    className="p-1 rounded text-primary hover:bg-primary/10 transition-colors" title="Vincular servidor"
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => { setEditingId(coord.id); setEditingValue(coord.nome); }} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => deleteCoord(coord.id)} className="p-1 rounded text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                </div>
                                {/* Assign dropdown for this coord */}
                                {assigningTo?.type === "coordenacao" && assigningTo.id === coord.id && (
                                  <div className="px-3 pb-2 space-y-2">
                                    <input
                                      autoFocus
                                      value={assignSearch}
                                      onChange={e => setAssignSearch(e.target.value)}
                                      placeholder="Buscar servidor por nome ou matrícula..."
                                      className="w-full h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                    />
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                      {filteredAssignResults.map(s => (
                                        <button
                                          key={s.id}
                                          onClick={() => assignServidor(s.id, assigningTo.diretoria_id, uni.id, coord.id)}
                                          className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-primary/10 transition-colors text-foreground"
                                        >
                                          <span className="font-medium">{s.nome}</span>
                                          <span className="text-muted-foreground ml-2">({s.matricula})</span>
                                        </button>
                                      ))}
                                      {filteredAssignResults.length === 0 && (
                                        <p className="text-xs text-muted-foreground py-1 px-2">Nenhum servidor encontrado</p>
                                      )}
                                    </div>
                                    <button onClick={() => { setAssigningTo(null); setAssignSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                                  </div>
                                )}
                                {/* List servidores in coord */}
                                {coordServs.length > 0 && (
                                  <div className="px-3 pb-2">
                                    {coordServs.map(s => (
                                      <div key={s.id} className="text-xs text-muted-foreground py-0.5 pl-2 border-l-2 border-primary/20">
                                        {s.nome} <span className="text-muted-foreground/60">— {s.cargo}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              );
                            })}

                            {newCoord?.unidade_id === uni.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={newCoord.nome}
                                  onChange={e => setNewCoord({ ...newCoord, nome: e.target.value })}
                                  onKeyDown={e => e.key === "Enter" && addCoord()}
                                  placeholder="Nome da coordenação..."
                                  className="flex-1 h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                />
                                <button onClick={addCoord} className="text-primary"><Check className="h-4 w-4" /></button>
                                <button onClick={() => setNewCoord(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setNewCoord({ nome: "", unidade_id: uni.id })}
                                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" /> Coordenação
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default function Estrutura() {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!session) return <LoginForm />;
  return <EstruturaContent />;
}
