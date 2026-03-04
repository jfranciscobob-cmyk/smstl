import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Megaphone, Trash2, Loader2, Send, Users, User, Eye, ArrowLeft, Building2, MapPin, XCircle
} from "lucide-react";

interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  destinatario_tipo: string;
  destinatario_user_id: string | null;
  destinatario_diretoria_id: string | null;
  destinatario_unidade_id: string | null;
  ativo: boolean;
  created_at: string;
  criado_por: string;
}

interface ProfileOption { id: string; email: string; nome: string | null; }
interface DiretoriaOption { id: string; nome: string; }
interface UnidadeOption { id: string; nome: string; sigla: string; diretoria_id: string; }

export default function Avisos() {
  const { toast } = useToast();
  const { user, isAdmin, isDiretor, isCoordenador, isCoordenadorGeral, diretoriaIds, unidadeIds } = useAuthSession();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lidosCount, setLidosCount] = useState<Record<string, number>>({});

  // Form
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [destino, setDestino] = useState("todos");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [diretoriaId, setDiretoriaId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Determine what destination types this user can pick
  const destinoOptions = (() => {
    const opts: { value: string; label: string; icon: React.ReactNode }[] = [];
    if (isAdmin) {
      opts.push({ value: "todos", label: "Todos os usuários", icon: <Users className="h-3.5 w-3.5" /> });
      opts.push({ value: "diretoria", label: "Diretoria específica", icon: <Building2 className="h-3.5 w-3.5" /> });
      opts.push({ value: "unidade", label: "Unidade específica", icon: <MapPin className="h-3.5 w-3.5" /> });
      opts.push({ value: "usuario", label: "Usuário específico", icon: <User className="h-3.5 w-3.5" /> });
    } else if (isDiretor || isCoordenadorGeral) {
      opts.push({ value: "diretoria", label: "Minha(s) Diretoria(s)", icon: <Building2 className="h-3.5 w-3.5" /> });
      opts.push({ value: "unidade", label: "Unidade específica", icon: <MapPin className="h-3.5 w-3.5" /> });
      opts.push({ value: "usuario", label: "Usuário específico", icon: <User className="h-3.5 w-3.5" /> });
    } else if (isCoordenador) {
      opts.push({ value: "unidade", label: "Minha(s) Unidade(s)", icon: <MapPin className="h-3.5 w-3.5" /> });
      opts.push({ value: "usuario", label: "Usuário específico", icon: <User className="h-3.5 w-3.5" /> });
    }
    return opts;
  })();

  // Set default destino based on role
  useEffect(() => {
    if (destinoOptions.length > 0 && !destinoOptions.find(o => o.value === destino)) {
      setDestino(destinoOptions[0].value);
    }
  }, [isAdmin, isDiretor, isCoordenador, isCoordenadorGeral]);

  // Available diretorias for the user
  const availableDiretorias = isAdmin ? diretorias : diretorias.filter(d => diretoriaIds.includes(d.id));
  // Available unidades: admin sees all, diretor sees own diretoria's, coordenador sees own
  const availableUnidades = isAdmin
    ? unidades
    : (isDiretor || isCoordenadorGeral)
      ? unidades.filter(u => diretoriaIds.includes(u.diretoria_id))
      : unidades.filter(u => unidadeIds.includes(u.id));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [avisosRes, profilesRes, diretoriasRes, unidadesRes] = await Promise.all([
      supabase.from("avisos").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, nome"),
      supabase.from("diretorias").select("id, nome"),
      supabase.from("unidades").select("id, nome, sigla, diretoria_id"),
    ]);
    const avisosData = (avisosRes.data as any[]) || [];
    setAvisos(avisosData);
    setProfiles((profilesRes.data as any[]) || []);
    setDiretorias((diretoriasRes.data as any[]) || []);
    setUnidades((unidadesRes.data as any[]) || []);

    // Load lidos counts
    if (avisosData.length > 0) {
      const counts: Record<string, number> = {};
      for (const aviso of avisosData) {
        const { count } = await supabase
          .from("avisos_lidos")
          .select("id", { count: "exact", head: true })
          .eq("aviso_id", aviso.id);
        counts[aviso.id] = count || 0;
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
    if (destino === "diretoria" && !diretoriaId && isAdmin) {
      toast({ title: "Selecione a diretoria", variant: "destructive" });
      return;
    }
    if (destino === "unidade" && !unidadeId) {
      toast({ title: "Selecione a unidade", variant: "destructive" });
      return;
    }

    setSending(true);

    // Determine final diretoria/unidade IDs
    let finalDiretoriaId: string | null = null;
    let finalUnidadeId: string | null = null;
    let finalDestinatarioId: string | null = null;

    if (destino === "diretoria") {
      finalDiretoriaId = isAdmin ? diretoriaId : (diretoriaId || diretoriaIds[0] || null);
    } else if (destino === "unidade") {
      finalUnidadeId = unidadeId;
    } else if (destino === "usuario") {
      finalDestinatarioId = destinatarioId;
    }

    const { error } = await supabase.from("avisos").insert({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      criado_por: user!.id,
      destinatario_tipo: destino,
      destinatario_user_id: finalDestinatarioId,
      destinatario_diretoria_id: finalDiretoriaId,
      destinatario_unidade_id: finalUnidadeId,
    });

    if (error) {
      toast({ title: "Erro ao enviar aviso", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aviso enviado com sucesso!" });
      setTitulo(""); setMensagem(""); setDestinatarioId(""); setDiretoriaId(""); setUnidadeId("");
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

  // Filter avisos: user sees only ones they created (unless admin sees all)
  const filteredAvisos = isAdmin ? avisos : avisos.filter(a => a.criado_por === user?.id);

  const getDestinoLabel = (aviso: Aviso) => {
    if (aviso.destinatario_tipo === "todos") return "📢 Todos";
    if (aviso.destinatario_tipo === "diretoria") {
      const dir = diretorias.find(d => d.id === aviso.destinatario_diretoria_id);
      return `🏢 ${dir?.nome || "Diretoria"}`;
    }
    if (aviso.destinatario_tipo === "unidade") {
      const uni = unidades.find(u => u.id === aviso.destinatario_unidade_id);
      return `📍 ${uni?.sigla || uni?.nome || "Unidade"}`;
    }
    if (aviso.destinatario_tipo === "usuario") {
      const p = profiles.find(p => p.id === aviso.destinatario_user_id);
      return `👤 ${p?.nome || p?.email || "Usuário"}`;
    }
    return aviso.destinatario_tipo;
  };

  const getCreatorName = (aviso: Aviso) => {
    const p = profiles.find(p => p.id === aviso.criado_por);
    return p?.nome || p?.email || "Sistema";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canSend = isAdmin || isDiretor || isCoordenadorGeral || isCoordenador;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all">
                <ArrowLeft className="h-4 w-4 text-primary-foreground" />
              </Link>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary-foreground" />
                <h1 className="text-lg font-bold text-primary-foreground">Avisos</h1>
              </div>
            </div>
            {canSend && (
              <Button
                onClick={() => setShowForm(!showForm)}
                size="sm"
                variant={showForm ? "outline" : "default"}
                className={showForm ? "border-primary-foreground/20 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20" : ""}
              >
                {showForm ? <><XCircle className="h-4 w-4 mr-1" /> Cancelar</> : <><Send className="h-4 w-4 mr-1" /> Novo Aviso</>}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-6 py-6 max-w-3xl space-y-6">
        {/* Form */}
        {showForm && canSend && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">Novo Aviso</h2>
            <Input placeholder="Título do aviso" value={titulo} onChange={e => setTitulo(e.target.value)} />
            <Textarea placeholder="Mensagem completa..." value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} />
            
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destinatário</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Select value={destino} onValueChange={(v) => { setDestino(v); setDestinatarioId(""); setDiretoriaId(""); setUnidadeId(""); }}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {destinoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">{opt.icon} {opt.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {destino === "diretoria" && availableDiretorias.length > 1 && (
                  <Select value={diretoriaId} onValueChange={setDiretoriaId}>
                    <SelectTrigger className="flex-1 w-full">
                      <SelectValue placeholder="Selecione a diretoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDiretorias.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {destino === "unidade" && (
                  <Select value={unidadeId} onValueChange={setUnidadeId}>
                    <SelectTrigger className="flex-1 w-full">
                      <SelectValue placeholder="Selecione a unidade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnidades.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.sigla} - {u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {destino === "usuario" && (
                  <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                    <SelectTrigger className="flex-1 w-full">
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
            </div>

            <Button onClick={enviarAviso} disabled={sending} className="w-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Aviso
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {filteredAvisos.filter(a => a.ativo).length} ativos
          </span>
          <span className="text-xs text-muted-foreground">
            {filteredAvisos.length} total
          </span>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredAvisos.map(aviso => (
            <div
              key={aviso.id}
              className={`rounded-2xl border p-5 transition-all ${
                aviso.ativo
                  ? "border-border bg-card shadow-sm"
                  : "border-border/50 bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-bold text-foreground">{aviso.titulo}</h3>
                    {aviso.ativo ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Ativo</span>
                    ) : (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">Inativo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{aviso.mensagem}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {getDestinoLabel(aviso)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      por {getCreatorName(aviso)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(aviso.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {lidosCount[aviso.id] || 0} leram
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {aviso.ativo && (aviso.criado_por === user?.id || isAdmin) && (
                    <Button variant="ghost" size="sm" onClick={() => desativarAviso(aviso.id)} className="text-xs">
                      Desativar
                    </Button>
                  )}
                  {(aviso.criado_por === user?.id || isAdmin) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => excluirAviso(aviso.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredAvisos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum aviso enviado ainda.</p>
              {canSend && <p className="text-sm mt-1">Clique em "Novo Aviso" para enviar o primeiro.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
