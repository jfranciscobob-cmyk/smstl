import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Trash2, Loader2, Send, Users, User, Eye } from "lucide-react";

interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  destinatario_tipo: string;
  destinatario_user_id: string | null;
  ativo: boolean;
  created_at: string;
}

interface ProfileOption {
  id: string;
  email: string;
  nome: string | null;
}

export default function GerenciarAvisos() {
  const { toast } = useToast();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [destino, setDestino] = useState("todos");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Lidos count
  const [lidosCount, setLidosCount] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: avisosData }, { data: profilesData }] = await Promise.all([
      supabase.from("avisos").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, nome"),
    ]);
    setAvisos((avisosData as any[]) || []);
    setProfiles((profilesData as any[]) || []);

    // Load lidos counts
    if (avisosData && avisosData.length > 0) {
      const counts: Record<string, number> = {};
      for (const aviso of avisosData) {
        const { count } = await supabase
          .from("avisos_lidos")
          .select("id", { count: "exact", head: true })
          .eq("aviso_id", (aviso as any).id);
        counts[(aviso as any).id] = count || 0;
      }
      setLidosCount(counts);
    }
    setLoading(false);
  }

  async function enviarAviso() {
    if (!titulo.trim() || !mensagem.trim()) {
      toast({ title: "Preencha título e mensagem", variant: "destructive" });
      return;
    }
    if (destino === "usuario" && !destinatarioId) {
      toast({ title: "Selecione o usuário destinatário", variant: "destructive" });
      return;
    }

    setSending(true);
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("avisos").insert({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      criado_por: userData.user?.id,
      destinatario_tipo: destino,
      destinatario_user_id: destino === "usuario" ? destinatarioId : null,
    });

    if (error) {
      toast({ title: "Erro ao enviar aviso", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aviso enviado com sucesso!" });
      setTitulo("");
      setMensagem("");
      setDestino("todos");
      setDestinatarioId("");
      setShowForm(false);
      loadData();
    }
    setSending(false);
  }

  async function desativarAviso(id: string) {
    await supabase.from("avisos").update({ ativo: false }).eq("id", id);
    loadData();
  }

  async function excluirAviso(id: string) {
    await supabase.from("avisos").delete().eq("id", id);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Avisos</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{avisos.filter(a => a.ativo).length} ativos</span>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" variant={showForm ? "outline" : "default"}>
          {showForm ? "Cancelar" : <><Send className="h-4 w-4 mr-1" /> Novo Aviso</>}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Input placeholder="Título do aviso" value={titulo} onChange={e => setTitulo(e.target.value)} />
          <Textarea placeholder="Mensagem completa..." value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} />
          <div className="flex items-center gap-3">
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos"><div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Todos os usuários</div></SelectItem>
                <SelectItem value="usuario"><div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Usuário específico</div></SelectItem>
              </SelectContent>
            </Select>
            {destino === "usuario" && (
              <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={enviarAviso} disabled={sending} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar Aviso
          </Button>
        </div>
      )}

      {/* Lista de avisos */}
      <div className="space-y-2">
        {avisos.map(aviso => (
          <div key={aviso.id} className={`rounded-xl border p-4 transition-colors ${aviso.ativo ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-sm">{aviso.titulo}</h3>
                  {aviso.ativo ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">Ativo</span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">Inativo</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {aviso.destinatario_tipo === "todos" ? "📢 Todos" : `👤 ${profiles.find(p => p.id === aviso.destinatario_user_id)?.nome || "Usuário"}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{aviso.mensagem}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(aviso.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {lidosCount[aviso.id] || 0} leram
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {aviso.ativo && (
                  <Button variant="ghost" size="sm" onClick={() => desativarAviso(aviso.id)} title="Desativar">
                    <span className="text-xs">Desativar</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => excluirAviso(aviso.id)} title="Excluir">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {avisos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum aviso enviado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
