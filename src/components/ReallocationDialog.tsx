import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { AlertTriangle, ArrowRight, Users, Loader2, Send, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ServidorDB, DiretoriaDB, UnidadeDB } from "@/hooks/useServidores";

export interface ReallocationRequest {
  servidorIds: string[];
  targetDiretoriaId: string;
  targetUnidadeId?: string;
  targetSetorId?: string;
}

interface ReallocationDialogProps {
  open: boolean;
  onClose: () => void;
  request: ReallocationRequest | null;
  servidores: ServidorDB[];
  diretorias: DiretoriaDB[];
  unidades: UnidadeDB[];
  userId: string;
  onComplete: (action: "kept_both" | "pending_approval") => void;
}

export function ReallocationDialog({
  open, onClose, request, servidores, diretorias, unidades, userId, onComplete,
}: ReallocationDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [choice, setChoice] = useState<"both" | "move_only" | null>(null);

  if (!request || request.servidorIds.length === 0) return null;

  // Filter only servers that already have allocation
  const allocatedServidores = request.servidorIds
    .map(id => servidores.find(s => s.id === id))
    .filter((s): s is ServidorDB => !!s && !!(s.diretoria_id || s.unidade_id));

  if (allocatedServidores.length === 0) return null;

  const getLocationLabel = (s: ServidorDB) => {
    const parts: string[] = [];
    if (s.diretoria_id) {
      const dir = diretorias.find(d => d.id === s.diretoria_id);
      if (dir) parts.push(dir.nome);
    }
    if (s.unidade_id) {
      const uni = unidades.find(u => u.id === s.unidade_id);
      if (uni) parts.push(uni.sigla);
    }
    return parts.join(" → ") || "Sem alocação";
  };

  const targetDir = diretorias.find(d => d.id === request.targetDiretoriaId);
  const targetUni = request.targetUnidadeId ? unidades.find(u => u.id === request.targetUnidadeId) : null;
  const targetLabel = [targetDir?.nome, targetUni?.sigla].filter(Boolean).join(" → ");

  const handleKeepBoth = async () => {
    setSending(true);

    // Send informative notifications to previous directors
    const notifications = allocatedServidores
      .filter(s => s.diretoria_id && s.diretoria_id !== request.targetDiretoriaId)
      .map(s => ({
        servidor_id: s.id,
        diretoria_origem_id: s.diretoria_id!,
        diretoria_destino_id: request.targetDiretoriaId,
        unidade_origem_id: s.unidade_id || null,
        unidade_destino_id: request.targetUnidadeId || null,
        solicitante_user_id: userId,
        tipo: "informativo",
        manter_ambos: true,
        observacao: observacao || `Servidor mantido em ambos os vínculos.`,
        status: "informativo",
      }));

    if (notifications.length > 0) {
      await supabase.from("transferencias").insert(notifications as any);
    }

    setSending(false);
    setObservacao("");
    setChoice(null);
    toast({
      title: "Servidores mantidos em ambos os vínculos",
      description: notifications.length > 0
        ? `${notifications.length} notificação(ões) enviada(s) aos diretores anteriores.`
        : undefined,
    });
    onComplete("kept_both");
    onClose();
  };

  const handleMoveOnly = async () => {
    setSending(true);

    // Send approval requests to previous directors
    const requests = allocatedServidores
      .filter(s => s.diretoria_id)
      .map(s => ({
        servidor_id: s.id,
        diretoria_origem_id: s.diretoria_id!,
        diretoria_destino_id: request.targetDiretoriaId,
        unidade_origem_id: s.unidade_id || null,
        unidade_destino_id: request.targetUnidadeId || null,
        solicitante_user_id: userId,
        tipo: "realocacao",
        manter_ambos: false,
        observacao: observacao || `Solicitação de realocação exclusiva.`,
        status: "pendente",
      }));

    if (requests.length > 0) {
      const { error } = await supabase.from("transferencias").insert(requests as any);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setSending(false);
        return;
      }
    }

    setSending(false);
    setObservacao("");
    setChoice(null);
    toast({
      title: "Solicitações de realocação enviadas!",
      description: `${requests.length} pedido(s) de autorização enviado(s) ao(s) diretor(es) anterior(es). A realocação ocorrerá após aprovação.`,
    });
    onComplete("pending_approval");
    onClose();
  };

  const reset = () => {
    setChoice(null);
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Servidor(es) com vínculo existente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* List affected servidores */}
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {allocatedServidores.length === 1 ? "O servidor abaixo já possui" : `${allocatedServidores.length} servidores abaixo já possuem`} alocação em outra pasta:
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {allocatedServidores.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-card/50 px-3 py-1.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{s.cargo} · {s.matricula}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <MapPin className="h-3 w-3" />
                    {getLocationLabel(s)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3 text-primary" />
              <span>Destino: <strong className="text-foreground">{targetLabel}</strong></span>
            </div>
          </div>

          {/* Choice buttons */}
          {!choice && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">O que deseja fazer?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setChoice("both")}
                  className="flex flex-col items-start gap-1.5 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 hover:border-primary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Users className="h-4 w-4" />
                    Manter em ambos
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    O servidor ficará vinculado à pasta atual e também à nova. O diretor anterior será apenas informado.
                  </p>
                </button>

                <button
                  onClick={() => setChoice("move_only")}
                  className="flex flex-col items-start gap-1.5 rounded-xl border-2 border-warning/20 bg-warning/5 p-4 hover:border-warning/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                    <ArrowRight className="h-4 w-4" />
                    Mover somente para o novo
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Será enviado um pedido de autorização ao diretor da pasta anterior. A realocação só ocorre após aprovação.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Confirmation step */}
          {choice && (
            <div className="space-y-3">
              <div className={`rounded-lg border p-3 ${choice === "both" ? "border-primary/30 bg-primary/5" : "border-warning/30 bg-warning/5"}`}>
                <p className="text-sm font-semibold text-foreground">
                  {choice === "both"
                    ? "✓ Manter em ambos os vínculos"
                    : "⚠ Solicitar autorização para mover"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {choice === "both"
                    ? "O(s) diretor(es) da pasta anterior será(ão) notificado(s)."
                    : "O(s) diretor(es) da pasta anterior precisa(m) aprovar. Até lá, o servidor permanece onde está."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Observação (opcional)
                </label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[50px]"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder={choice === "both" ? "Motivo para manter em ambos..." : "Justificativa da realocação..."}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={reset}
                  className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={choice === "both" ? handleKeepBoth : handleMoveOnly}
                  disabled={sending}
                  className={`flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    choice === "both"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-warning text-warning-foreground hover:bg-warning/90"
                  }`}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Enviando..." : choice === "both" ? "Confirmar" : "Enviar solicitação"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
