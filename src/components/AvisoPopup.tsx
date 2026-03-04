import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  created_at: string;
  destinatario_tipo: string;
  destinatario_user_id: string | null;
  destinatario_diretoria_id: string | null;
  destinatario_unidade_id: string | null;
}

export default function AvisoPopup({ userId }: { userId: string }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [currentAviso, setCurrentAviso] = useState<Aviso | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadAvisosPendentes();
  }, [userId]);

  async function loadAvisosPendentes() {
    // Load all active avisos
    const { data: todosAvisos, error: err1 } = await supabase
      .from("avisos")
      .select("id, titulo, mensagem, created_at, destinatario_tipo, destinatario_user_id, destinatario_diretoria_id, destinatario_unidade_id")
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (err1 || !todosAvisos || todosAvisos.length === 0) return;

    // Load user's profile to get their diretoria/unidade
    const [profileRes, userDiretoriasRes, userUnidadesRes, lidosRes] = await Promise.all([
      supabase.from("profiles").select("diretoria_id, unidade_id").eq("id", userId).maybeSingle(),
      supabase.from("user_diretorias").select("diretoria_id").eq("user_id", userId),
      supabase.from("user_unidades").select("unidade_id").eq("user_id", userId),
      supabase.from("avisos_lidos").select("aviso_id").eq("user_id", userId),
    ]);

    const userDirIds = new Set([
      ...(userDiretoriasRes.data || []).map((d: any) => d.diretoria_id),
      ...(profileRes.data?.diretoria_id ? [profileRes.data.diretoria_id] : []),
    ]);
    const userUniIds = new Set([
      ...(userUnidadesRes.data || []).map((u: any) => u.unidade_id),
      ...(profileRes.data?.unidade_id ? [profileRes.data.unidade_id] : []),
    ]);

    const lidosSet = new Set((lidosRes.data || []).map((l: any) => l.aviso_id));

    // Filter: user sees avisos targeted to them
    const relevantes = (todosAvisos as Aviso[]).filter(a => {
      if (lidosSet.has(a.id)) return false;
      if (a.destinatario_tipo === "todos") return true;
      if (a.destinatario_tipo === "usuario" && a.destinatario_user_id === userId) return true;
      if (a.destinatario_tipo === "diretoria" && a.destinatario_diretoria_id && userDirIds.has(a.destinatario_diretoria_id)) return true;
      if (a.destinatario_tipo === "unidade" && a.destinatario_unidade_id && userUniIds.has(a.destinatario_unidade_id)) return true;
      return false;
    });

    setAvisos(relevantes);
    if (relevantes.length > 0) {
      setCurrentAviso(relevantes[0]);
    }
  }

  async function marcarComoLido() {
    if (!currentAviso) return;
    setConfirmando(true);

    await supabase.from("avisos_lidos").insert({
      aviso_id: currentAviso.id,
      user_id: userId,
    });

    const remaining = avisos.filter((a) => a.id !== currentAviso.id);
    setAvisos(remaining);
    setCurrentAviso(remaining.length > 0 ? remaining[0] : null);
    setConfirmando(false);
  }

  if (!currentAviso) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-destructive/10 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">Aviso Importante</h2>
            <p className="text-xs text-muted-foreground">
              {new Date(currentAviso.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {avisos.length > 1 && (
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {avisos.indexOf(currentAviso) + 1}/{avisos.length}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[50vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-foreground mb-3">{currentAviso.titulo}</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {currentAviso.mensagem}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <Button
            onClick={marcarComoLido}
            disabled={confirmando}
            className="w-full h-12 text-base font-bold"
            variant="default"
          >
            {confirmando ? "Confirmando..." : "Estou ciente e li este aviso"}
          </Button>
        </div>
      </div>
    </div>
  );
}
