import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServidorDB, DiretoriaDB } from "@/hooks/useServidores";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { ArrowRight, Loader2, AlertTriangle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransferServidorModalProps {
  servidor: ServidorDB | null;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  diretorias: DiretoriaDB[];
  currentDiretoriaId: string;
  userId: string;
}

export function TransferServidorModal({
  servidor, open, onClose, onSent, diretorias, currentDiretoriaId, userId,
}: TransferServidorModalProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [destDiretoriaId, setDestDiretoriaId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  const currentDir = diretorias.find(d => d.id === currentDiretoriaId);
  const destDir = diretorias.find(d => d.id === destDiretoriaId);
  const otherDiretorias = diretorias.filter(d => d.id !== currentDiretoriaId);

  const handleSend = async () => {
    if (!servidor || !destDiretoriaId) return;
    setSending(true);

    const { error } = await supabase.from("transferencias").insert({
      servidor_id: servidor.id,
      diretoria_origem_id: currentDiretoriaId,
      diretoria_destino_id: destDiretoriaId,
      solicitante_user_id: userId,
      observacao: observacao || null,
    } as any);

    setSending(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Solicitação enviada!",
        description: `Transferência de ${servidor.nome} para ${destDir?.nome} aguarda aprovação.`,
      });
      setDestDiretoriaId("");
      setObservacao("");
      setConfirmStep(false);
      onSent();
      onClose();
    }
  };

  const reset = () => {
    setConfirmStep(false);
    setDestDiretoriaId("");
    setObservacao("");
  };

  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Transferir Servidor
          </DialogTitle>
        </DialogHeader>

        {servidor && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{servidor.nome}</p>
              <p className="text-xs text-muted-foreground">{servidor.cargo} · {servidor.vinculo}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Origem: <span className="font-medium text-foreground">{currentDir?.nome || "—"}</span>
              </p>
            </div>

            {!confirmStep ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Diretoria de destino
                  </label>
                  <select
                    className={selectClass}
                    value={destDiretoriaId}
                    onChange={(e) => setDestDiretoriaId(e.target.value)}
                  >
                    <option value="">— Selecione a diretoria —</option>
                    {otherDiretorias.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Justificativa / Observação
                  </label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Motivo da transferência..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setConfirmStep(true)}
                    disabled={!destDiretoriaId}
                    className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-warning font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Confirmar Solicitação de Transferência
                  </div>
                  <div className="text-xs text-foreground space-y-1">
                    <p>
                      <strong>{servidor.nome}</strong> será solicitado para transferência de{" "}
                      <strong>{currentDir?.nome}</strong> para <strong>{destDir?.nome}</strong>.
                    </p>
                    <p className="text-muted-foreground">
                      O(A) diretor(a) da diretoria de destino precisará aprovar esta transferência.
                      Até lá, o servidor permanece na diretoria atual.
                    </p>
                    {observacao && (
                      <p className="italic text-muted-foreground">"{observacao}"</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setConfirmStep(false)}
                    className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Enviando..." : "Enviar Solicitação"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
