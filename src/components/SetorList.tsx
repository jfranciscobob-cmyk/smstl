import { useState } from "react";
import type { SetorDB, ServidorDB } from "@/hooks/useServidores";
import {
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, Users, Crown, X
} from "lucide-react";

interface SetorListProps {
  setores: SetorDB[];
  servidores: ServidorDB[];
  diretoriaId: string | null;
  onAddSetor: (nome: string, cargoGestao: string, diretoriaId: string | null) => void;
  onDeleteSetor: (id: string) => void;
  onAssignServidor: (servidorId: string, setorId: string, diretoriaId: string | null) => void;
  onSetResponsavel: (setorId: string, servidorId: string) => void;
  allServidores: ServidorDB[];
}

export function SetorList({
  setores,
  servidores,
  diretoriaId,
  onAddSetor,
  onDeleteSetor,
  onAssignServidor,
  onSetResponsavel,
  allServidores,
}: SetorListProps) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [cargoGestao, setCargoGestao] = useState("");
  const [expandedSetores, setExpandedSetores] = useState<Record<string, boolean>>({});
  const [assigningSetorId, setAssigningSetorId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [pickingResponsavel, setPickingResponsavel] = useState<string | null>(null);
  const [respSearch, setRespSearch] = useState("");

  const toggleExpand = (id: string) => setExpandedSetores(prev => ({ ...prev, [id]: !prev[id] }));

  const getServidoresInSetor = (setorId: string) =>
    servidores.filter(s => (s as any).setor_id === setorId);

  const getResponsavel = (responsavelId: string | null) =>
    responsavelId ? allServidores.find(s => s.id === responsavelId) : null;

  const filteredAssign = assignSearch.length >= 2
    ? allServidores.filter(s => s.nome.toLowerCase().includes(assignSearch.toLowerCase()) || s.matricula.includes(assignSearch)).slice(0, 8)
    : allServidores.slice(0, 8);

  const filteredResp = respSearch.length >= 2
    ? allServidores.filter(s => s.nome.toLowerCase().includes(respSearch.toLowerCase()) || s.matricula.includes(respSearch)).slice(0, 8)
    : allServidores.slice(0, 8);

  const handleAdd = () => {
    if (!nome.trim()) return;
    onAddSetor(nome.trim(), cargoGestao.trim(), diretoriaId);
    setNome("");
    setCargoGestao("");
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5" /> Setores/Funções ({setores.length})
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Novo setor
        </button>
      </div>

      {showForm && (
        <div className="flex gap-2 items-center bg-muted/30 rounded-lg p-3">
          <input
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Nome do setor..."
            className="flex-1 h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <input
            value={cargoGestao}
            onChange={e => setCargoGestao(e.target.value)}
            placeholder="Cargo de gestão (opcional)"
            className="w-48 h-8 rounded border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <button onClick={handleAdd} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Criar
          </button>
          <button onClick={() => setShowForm(false)} className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {setores.map(setor => {
        const setorServidores = getServidoresInSetor(setor.id);
        const responsavel = getResponsavel(setor.responsavel_id);
        const isExpanded = expandedSetores[setor.id];

        return (
          <div key={setor.id} className="border border-border/40 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
              <button onClick={() => toggleExpand(setor.id)} className="flex items-center gap-2 flex-1 text-left">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground">{setor.nome}</span>
                  {setor.cargo_gestao && (
                    <span className="ml-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{setor.cargo_gestao}</span>
                  )}
                  <span className="ml-2 text-[10px] text-muted-foreground">{setorServidores.length} servidor(es)</span>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAssigningSetorId(setor.id)}
                  className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Vincular servidor"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteSetor(setor.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir setor"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Responsável */}
            <div className="px-3 py-1.5 border-t border-border/20 bg-muted/10 flex items-center gap-2 flex-wrap">
              <Crown className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável:</span>
              {responsavel ? (
                <span className="text-xs font-medium text-foreground">{responsavel.nome}</span>
              ) : pickingResponsavel === setor.id ? (
                <div className="flex-1 max-w-xs space-y-1">
                  <input
                    autoFocus
                    value={respSearch}
                    onChange={e => setRespSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full h-6 rounded border border-input bg-card px-2 text-[10px] text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                  <div className="max-h-28 overflow-y-auto bg-card rounded border border-border shadow-md">
                    {filteredResp.map(s => (
                      <button key={s.id} onClick={() => { onSetResponsavel(setor.id, s.id); setPickingResponsavel(null); setRespSearch(""); }} className="w-full text-left px-2 py-1 text-[10px] hover:bg-primary/10 text-foreground">
                        {s.nome}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setPickingResponsavel(null); setRespSearch(""); }} className="text-[10px] text-muted-foreground">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setPickingResponsavel(setor.id)} className="text-[10px] text-primary font-medium">+ Definir</button>
              )}
            </div>

            {/* Assign dropdown */}
            {assigningSetorId === setor.id && (
              <div className="px-3 py-2 border-t border-border/20 space-y-1">
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Buscar servidor..."
                  className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                />
                <div className="max-h-32 overflow-y-auto bg-card rounded border border-border shadow-md">
                  {filteredAssign.map(s => (
                    <button key={s.id} onClick={() => onAssignServidor(s.id, setor.id, diretoriaId)} className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 text-foreground">
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-muted-foreground ml-1">({s.cargo})</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setAssigningSetorId(null); setAssignSearch(""); }} className="text-[10px] text-muted-foreground">Cancelar</button>
              </div>
            )}

            {/* Servidores in setor */}
            {isExpanded && setorServidores.length > 0 && (
              <div className="border-t border-border/20 divide-y divide-border/10">
                {setorServidores.map(s => (
                  <div key={s.id} className="px-3 py-1.5 text-xs text-foreground flex items-center justify-between">
                    <div>
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-muted-foreground ml-2">({s.cargo})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isExpanded && setorServidores.length === 0 && (
              <div className="border-t border-border/20 px-3 py-2 text-[10px] text-muted-foreground italic">
                Nenhum servidor vinculado a este setor.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
