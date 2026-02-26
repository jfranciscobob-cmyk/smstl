import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiretoriaDB, ServidorDB } from "@/hooks/useServidores";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { ArrowRight, Check, X, Loader2, Clock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransferenciaRow {
  id: string;
  servidor_id: string;
  diretoria_origem_id: string;
  diretoria_destino_id: string;
  solicitante_user_id: string;
  status: string;
  observacao: string | null;
  resposta_observacao: string | null;
  created_at: string;
  respondido_at: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  diretorias: DiretoriaDB[];
  servidores: ServidorDB[];
  userId: string;
  userDiretoriaId: string | null; // diretoria where user is director
  isAdmin: boolean;
  onTransferApproved: () => void;
}

export function TransferenciasPendentes({
  open, onClose, diretorias, servidores, userId, userDiretoriaId, isAdmin, onTransferApproved,
}: Props) {
  const { toast } = useToast();
  const [transferencias, setTransferencias] = useState<TransferenciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [respostaObs, setRespostaObs] = useState<Record<string, string>>({});

  const loadTransferencias = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transferencias")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransferencias(data as TransferenciaRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadTransferencias();
  }, [open, loadTransferencias]);

  // Listen for realtime changes
  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel("transferencias-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transferencias" }, () => {
        loadTransferencias();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, loadTransferencias]);

  const getDirNome = (id: string) => diretorias.find(d => d.id === id)?.nome || "—";
  const getServNome = (id: string) => servidores.find(s => s.id === id)?.nome || "—";

  const canRespond = (t: TransferenciaRow) => {
    if (t.status !== "pendente") return false;
    if (isAdmin) return true;
    return userDiretoriaId === t.diretoria_destino_id;
  };

  const handleRespond = async (t: TransferenciaRow, approve: boolean) => {
    setProcessingId(t.id);

    // Update transferencia status
    const { error: updateError } = await supabase
      .from("transferencias")
      .update({
        status: approve ? "aprovada" : "rejeitada",
        respondido_por_user_id: userId,
        respondido_at: new Date().toISOString(),
        resposta_observacao: respostaObs[t.id] || null,
      } as any)
      .eq("id", t.id);

    if (updateError) {
      toast({ title: "Erro", description: updateError.message, variant: "destructive" });
      setProcessingId(null);
      return;
    }

    // If approved, move servidor
    if (approve) {
      const { error: moveError } = await supabase
        .from("servidores")
        .update({
          diretoria_id: t.diretoria_destino_id,
          unidade_id: null,
          coordenacao_id: null,
          observacao: `[TRANSFERÊNCIA] De ${getDirNome(t.diretoria_origem_id)} para ${getDirNome(t.diretoria_destino_id)} em ${new Date().toLocaleDateString("pt-BR")}`,
        })
        .eq("id", t.servidor_id);

      if (moveError) {
        toast({ title: "Erro ao mover servidor", description: moveError.message, variant: "destructive" });
      } else {
        toast({ title: "Transferência aprovada!", description: `${getServNome(t.servidor_id)} transferido(a) com sucesso.` });
        onTransferApproved();
      }
    } else {
      toast({ title: "Transferência rejeitada", description: `Solicitação para ${getServNome(t.servidor_id)} foi rejeitada.` });
    }

    setProcessingId(null);
    loadTransferencias();
  };

  const pendentes = transferencias.filter(t => t.status === "pendente");
  const historico = transferencias.filter(t => t.status !== "pendente");

  // Count relevant to current user
  const minhasPendentes = pendentes.filter(t => canRespond(t));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Transferências
            {minhasPendentes.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {minhasPendentes.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Pendentes */}
            {pendentes.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  Pendentes ({pendentes.length})
                </h3>
                <div className="space-y-3">
                  {pendentes.map(t => (
                    <div key={t.id} className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">{getServNome(t.servidor_id)}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{getDirNome(t.diretoria_origem_id)}</span>
                            <ArrowRight className="h-3 w-3 text-primary" />
                            <span className="font-semibold text-foreground">{getDirNome(t.diretoria_destino_id)}</span>
                          </div>
                          {t.observacao && (
                            <p className="text-xs text-muted-foreground italic mt-1">"{t.observacao}"</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-[10px] font-bold text-warning uppercase">
                          <Clock className="h-3 w-3" /> Pendente
                        </span>
                      </div>

                      {canRespond(t) && (
                        <div className="space-y-2 pt-2 border-t border-warning/20">
                          <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
                            placeholder="Observação da resposta (opcional)..."
                            value={respostaObs[t.id] || ""}
                            onChange={(e) => setRespostaObs(prev => ({ ...prev, [t.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(t, true)}
                              disabled={processingId === t.id}
                              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-success text-success-foreground text-xs font-semibold hover:bg-success/90 disabled:opacity-50 transition-colors"
                            >
                              {processingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRespond(t, false)}
                              disabled={processingId === t.id}
                              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                            >
                              <X className="h-3 w-3" />
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pendentes.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma transferência pendente.
              </div>
            )}

            {/* Histórico */}
            {historico.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Histórico
                </h3>
                <div className="space-y-2">
                  {historico.slice(0, 20).map(t => (
                    <div key={t.id} className={`rounded-lg border px-4 py-3 text-xs ${
                      t.status === "aprovada" ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-foreground">{getServNome(t.servidor_id)}</span>
                          <span className="text-muted-foreground mx-1.5">·</span>
                          <span className="text-muted-foreground">{getDirNome(t.diretoria_origem_id)}</span>
                          <ArrowRight className="h-3 w-3 inline mx-1 text-primary" />
                          <span className="text-muted-foreground">{getDirNome(t.diretoria_destino_id)}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          t.status === "aprovada" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                        }`}>
                          {t.status === "aprovada" ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                          {t.status}
                        </span>
                      </div>
                      {t.respondido_at && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(t.respondido_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
