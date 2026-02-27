import { useState } from "react";
import type { SetorDB, ServidorDB } from "@/hooks/useServidores";
import {
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, Users, Crown, X, Check, AlertTriangle, Clock
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";

interface ServidorSetorJunction {
  servidor_id: string;
  setor_id: string;
}

interface SetorListProps {
  setores: SetorDB[];
  servidores: ServidorDB[];
  diretoriaId: string | null;
  onAddSetor: (nome: string, cargoGestao: string, diretoriaId: string | null) => void;
  onDeleteSetor: (id: string) => void;
  onAssignServidor: (servidorId: string, setorId: string, diretoriaId: string | null) => void;
  onBulkAssignServidor?: (servidorIds: string[], setorId: string, diretoriaId: string | null) => void;
  onSetResponsavel: (setorId: string, servidorId: string) => void;
  onKeepInBothSetores?: (servidorId: string, newSetorId: string) => void;
  onBulkKeepInBothSetores?: (servidorIds: string[], newSetorId: string) => void;
  contextServidores: ServidorDB[];
  servidoresSetores?: ServidorSetorJunction[];
}

interface ConflictInfo {
  servidor: ServidorDB;
  currentSetorName: string;
  newSetorId: string;
  hasScheduleConflict: boolean;
  escalaInfo: string;
}

export function SetorList({
  setores,
  servidores,
  diretoriaId,
  onAddSetor,
  onDeleteSetor,
  onAssignServidor,
  onBulkAssignServidor,
  onSetResponsavel,
  onKeepInBothSetores,
  onBulkKeepInBothSetores,
  contextServidores,
  servidoresSetores = [],
}: SetorListProps) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [cargoGestao, setCargoGestao] = useState("");
  const [expandedSetores, setExpandedSetores] = useState<Record<string, boolean>>({});
  const [assigningSetorId, setAssigningSetorId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickingResponsavel, setPickingResponsavel] = useState<string | null>(null);
  const [respSearch, setRespSearch] = useState("");
  const [conflictDialog, setConflictDialog] = useState<ConflictInfo | null>(null);

  const toggleExpand = (id: string) => setExpandedSetores(prev => ({ ...prev, [id]: !prev[id] }));

  const getServidoresInSetor = (setorId: string) => {
    const primaryIds = servidores.filter(s => s.setor_id === setorId).map(s => s.id);
    const junctionIds = servidoresSetores.filter(ss => ss.setor_id === setorId).map(ss => ss.servidor_id);
    const allIds = [...new Set([...primaryIds, ...junctionIds])];
    return allIds.map(id => servidores.find(s => s.id === id) || contextServidores.find(s => s.id === id)).filter(Boolean) as ServidorDB[];
  };

  const getResponsavel = (responsavelId: string | null) =>
    responsavelId ? servidores.find(s => s.id === responsavelId) || contextServidores.find(s => s.id === responsavelId) : null;

  const getSetorNameById = (setorId: string) => setores.find(s => s.id === setorId)?.nome || "Setor desconhecido";

  const getServidorSetores = (servidorId: string): string[] => {
    const ids: string[] = [];
    const srv = servidores.find(s => s.id === servidorId);
    if (srv?.setor_id) ids.push(srv.setor_id);
    servidoresSetores.filter(ss => ss.servidor_id === servidorId).forEach(ss => {
      if (!ids.includes(ss.setor_id)) ids.push(ss.setor_id);
    });
    return ids;
  };

  const checkScheduleConflict = (servidor: ServidorDB): { hasConflict: boolean; info: string } => {
    const escala1 = servidor.escala_inicio1 && servidor.escala_fim1
      ? `${servidor.escala_inicio1} - ${servidor.escala_fim1}` : null;
    const escala2 = servidor.escala_inicio2 && servidor.escala_fim2
      ? `${servidor.escala_inicio2} - ${servidor.escala_fim2}` : null;
    const totalHoras = servidor.escala_total_horas;

    if (!escala1 && !totalHoras) {
      return { hasConflict: false, info: "Sem escala cadastrada" };
    }

    const hasConflict = (totalHoras || 0) > 0;
    const parts: string[] = [];
    if (escala1) parts.push(`Turno 1: ${escala1}`);
    if (escala2) parts.push(`Turno 2: ${escala2}`);
    if (totalHoras) parts.push(`Total: ${totalHoras}h`);

    return {
      hasConflict,
      info: parts.join(" | ") || "Sem escala"
    };
  };

  const availableForAssign = contextServidores;
  const filteredAssign = assignSearch.length >= 2
    ? availableForAssign.filter(s => s.nome.toLowerCase().includes(assignSearch.toLowerCase()) || s.matricula.includes(assignSearch)).slice(0, 30)
    : availableForAssign.slice(0, 30);

  const filteredResp = respSearch.length >= 2
    ? contextServidores.filter(s => s.nome.toLowerCase().includes(respSearch.toLowerCase()) || s.matricula.includes(respSearch)).slice(0, 8)
    : contextServidores.slice(0, 8);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssignWithConflictCheck = (servidorId: string, setorId: string) => {
    const servidor = servidores.find(s => s.id === servidorId) || contextServidores.find(s => s.id === servidorId);
    if (!servidor) return;

    const currentSetorIds = getServidorSetores(servidorId);
    const isAlreadyInThisSetor = currentSetorIds.includes(setorId);
    if (isAlreadyInThisSetor) return;

    if (currentSetorIds.length > 0) {
      const currentSetorName = currentSetorIds.map(id => getSetorNameById(id)).join(", ");
      const scheduleCheck = checkScheduleConflict(servidor);
      setConflictDialog({
        servidor,
        currentSetorName,
        newSetorId: setorId,
        hasScheduleConflict: scheduleCheck.hasConflict,
        escalaInfo: scheduleCheck.info,
      });
      return;
    }

    onAssignServidor(servidorId, setorId, diretoriaId);
  };

  const handleBulkAssign = (setorId: string) => {
    if (selectedIds.size === 0) return;

    const conflictIds: string[] = [];
    const noConflictIds: string[] = [];

    selectedIds.forEach(id => {
      const srv = servidores.find(s => s.id === id) || contextServidores.find(s => s.id === id);
      if (!srv) return;
      const currentSetorIds = getServidorSetores(id);

      if (currentSetorIds.includes(setorId)) return;
      if (currentSetorIds.length > 0) {
        conflictIds.push(id);
      } else {
        noConflictIds.push(id);
      }
    });

    if (noConflictIds.length > 0) {
      if (onBulkAssignServidor) {
        onBulkAssignServidor(noConflictIds, setorId, diretoriaId);
      } else {
        noConflictIds.forEach(id => onAssignServidor(id, setorId, diretoriaId));
      }
    }

    if (conflictIds.length > 0) {
      if (onBulkKeepInBothSetores) {
        onBulkKeepInBothSetores(conflictIds, setorId);
        setSelectedIds(new Set());
        setAssigningSetorId(null);
        setAssignSearch("");
        return;
      }

      if (onKeepInBothSetores) {
        conflictIds.forEach(id => onKeepInBothSetores(id, setorId));
        setSelectedIds(new Set());
        setAssigningSetorId(null);
        setAssignSearch("");
        return;
      }

      const firstConflictId = conflictIds[0];
      const srv = servidores.find(s => s.id === firstConflictId) || contextServidores.find(s => s.id === firstConflictId);
      if (!srv) return;

      const currentSetorIds = getServidorSetores(srv.id);
      const currentSetorName = currentSetorIds.map(id => getSetorNameById(id)).join(", ");
      const scheduleCheck = checkScheduleConflict(srv);

      setConflictDialog({
        servidor: srv,
        currentSetorName,
        newSetorId: setorId,
        hasScheduleConflict: scheduleCheck.hasConflict,
        escalaInfo: scheduleCheck.info,
      });
      return;
    }

    setSelectedIds(new Set());
    setAssigningSetorId(null);
    setAssignSearch("");
  };

  const handleConflictMove = () => {
    if (!conflictDialog) return;
    onAssignServidor(conflictDialog.servidor.id, conflictDialog.newSetorId, diretoriaId);
    setConflictDialog(null);
    setSelectedIds(new Set());
    setAssigningSetorId(null);
    setAssignSearch("");
  };

  const handleConflictKeepBoth = () => {
    if (!conflictDialog) return;
    if (onKeepInBothSetores) {
      onKeepInBothSetores(conflictDialog.servidor.id, conflictDialog.newSetorId);
    }
    setConflictDialog(null);
    setSelectedIds(new Set());
    setAssigningSetorId(null);
    setAssignSearch("");
  };

  const handleAdd = () => {
    if (!nome.trim()) return;
    onAddSetor(nome.trim(), cargoGestao.trim(), diretoriaId);
    setNome("");
    setCargoGestao("");
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      {/* Conflict Dialog */}
      <AlertDialog open={!!conflictDialog} onOpenChange={() => setConflictDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Servidor já alocado em outro setor
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-foreground font-medium">
                  <strong>{conflictDialog?.servidor.nome}</strong> ({conflictDialog?.servidor.cargo})
                </p>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Alocação atual:</strong> {conflictDialog?.currentSetorName}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Novo setor:</strong> {conflictDialog ? getSetorNameById(conflictDialog.newSetorId) : ""}
                  </p>
                </div>

                {conflictDialog?.hasScheduleConflict && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-semibold text-red-700 dark:text-red-300">⚠️ Possível conflito de escala</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {conflictDialog.escalaInfo}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Alocar em dois setores pode gerar conflito de horário. Verifique a compatibilidade da escala.
                    </p>
                  </div>
                )}

                {!conflictDialog?.hasScheduleConflict && conflictDialog?.escalaInfo && (
                  <div className="rounded-lg bg-muted/40 border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{conflictDialog.escalaInfo}</span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Deseja <strong>mover</strong> para o novo setor ou <strong>manter em ambos</strong>?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConflictMove}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Mover (remover do anterior)
            </AlertDialogAction>
            {onKeepInBothSetores && (
              <AlertDialogAction
                onClick={handleConflictKeepBoth}
                className="bg-primary hover:bg-primary/90"
              >
                Manter em ambos os setores
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  onClick={() => { setAssigningSetorId(setor.id); setSelectedIds(new Set()); }}
                  className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Vincular servidores"
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

            {/* Multi-select assign dropdown */}
            {assigningSetorId === setor.id && (
              <div className="px-3 py-2 border-t border-border/20 space-y-2">
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Buscar servidor..."
                  className="w-full h-7 rounded border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                />
                <div className="max-h-48 overflow-y-auto bg-card rounded border border-border shadow-md">
                  {filteredAssign.map(s => {
                    const currentSetorIds = getServidorSetores(s.id);
                    const isInOtherSetor = currentSetorIds.length > 0 && !currentSetorIds.includes(setor.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-primary/10 text-foreground cursor-pointer ${isInOtherSetor ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                        />
                        <span className="font-medium">{s.nome}</span>
                        <span className="text-muted-foreground">({s.cargo})</span>
                        {isInOtherSetor && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Em: {currentSetorIds.map(id => getSetorNameById(id)).join(", ")}
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {filteredAssign.length === 0 && (
                    <p className="text-[10px] text-muted-foreground py-2 px-2">Nenhum servidor encontrado neste contexto.</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkAssign(setor.id)}
                      className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Check className="h-3 w-3" /> Vincular {selectedIds.size} servidor(es)
                    </button>
                  )}
                  <button onClick={() => { setAssigningSetorId(null); setAssignSearch(""); setSelectedIds(new Set()); }} className="text-[10px] text-muted-foreground">Cancelar</button>
                </div>
              </div>
            )}

            {/* Servidores in setor */}
            {isExpanded && setorServidores.length > 0 && (
              <div className="border-t border-border/20 divide-y divide-border/10">
                {setorServidores.map(s => {
                  const srvSetorIds = getServidorSetores(s.id);
                  const isMultiSetor = srvSetorIds.length > 1;
                  return (
                    <div key={s.id} className="px-3 py-1.5 text-xs text-foreground flex items-center justify-between">
                      <div>
                        <span className="font-medium">{s.nome}</span>
                        <span className="text-muted-foreground ml-2">({s.cargo})</span>
                        {isMultiSetor && (
                          <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                            Multi-setor
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
