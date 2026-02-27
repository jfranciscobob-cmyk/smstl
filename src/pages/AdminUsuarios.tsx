import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, UserPlus, Shield, Building2, Users, Pencil, Key, X, Check, XCircle, Clock, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  email: string;
  nome: string | null;
  servidor_id: string | null;
  diretoria_id: string | null;
  unidade_id: string | null;
  acesso_financeiro: boolean;
  created_at: string;
  last_seen_at: string | null;
}

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
}

interface RegistrationRequest {
  id: string;
  email: string;
  nome: string;
  role_requested: string;
  diretoria_id: string | null;
  status: string;
  created_at: string;
  motivo_rejeicao: string | null;
}

interface DiretoriaOption { id: string; nome: string; }
interface UnidadeOption { id: string; nome: string; sigla: string; diretoria_id: string; }

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 2 * 60 * 1000;
}

export default function AdminUsuarios() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "coordenador", diretoria_id: "", unidade_id: "" });
  const [creating, setCreating] = useState(false);

  const [editUser, setEditUser] = useState<ProfileRow | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", role: "", password: "", acesso_financeiro: false, diretoria_id: "", unidade_id: "" });
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [p, r, req, dir, uni] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("registration_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("diretorias").select("id, nome").order("nome"),
      supabase.from("unidades").select("id, nome, sigla, diretoria_id").order("nome"),
    ]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setRequests((req.data ?? []) as RegistrationRequest[]);
    setDiretorias((dir.data ?? []) as DiretoriaOption[]);
    setUnidades((uni.data ?? []) as UnidadeOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getRoles = (userId: string) => roles.filter(r => r.user_id === userId).map(r => r.role);

  const roleLabel: Record<string, string> = { admin: "Administrador", diretor: "Diretor", coordenador: "Coordenador" };
  const roleColor: Record<string, string> = { admin: "bg-primary/10 text-primary", diretor: "bg-amber-500/10 text-amber-600", coordenador: "bg-accent text-accent-foreground" };

  const createUser = async () => {
    if (!form.email || !form.password || form.password.length < 6) {
      toast({ title: "Preencha email e senha (mín. 6 caracteres)", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email: form.email, password: form.password, nome: form.nome, role: form.role },
    });
    if (error || !data?.success) {
      toast({ title: "Erro ao criar usuário", description: data?.error || error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }
    // Set diretoria/unidade on profile
    const profileUpdate: Record<string, unknown> = {};
    if (form.role === "diretor" && form.diretoria_id) profileUpdate.diretoria_id = form.diretoria_id;
    if (form.role === "coordenador" && form.unidade_id) profileUpdate.unidade_id = form.unidade_id;
    if (Object.keys(profileUpdate).length > 0 && data.user_id) {
      await supabase.from("profiles").update(profileUpdate).eq("id", data.user_id);
    }
    toast({ title: "Usuário criado com sucesso!" });
    setShowForm(false);
    setForm({ email: "", password: "", nome: "", role: "coordenador", diretoria_id: "", unidade_id: "" });
    setCreating(false);
    loadData();
  };

  const openEdit = (profile: ProfileRow) => {
    const userRoles = getRoles(profile.id);
    setEditUser(profile);
    setEditForm({
      nome: profile.nome || "",
      role: userRoles[0] || "coordenador",
      password: "",
      acesso_financeiro: profile.acesso_financeiro ?? false,
      diretoria_id: profile.diretoria_id || "",
      unidade_id: profile.unidade_id || "",
    });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    if (editForm.password && editForm.password.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("update-user", {
      body: {
        user_id: editUser.id, nome: editForm.nome, role: editForm.role,
        password: editForm.password || undefined, acesso_financeiro: editForm.acesso_financeiro,
      },
    });
    if (error || !data?.success) {
      toast({ title: "Erro ao salvar", description: data?.error || error?.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    // Update diretoria/unidade on profile
    await supabase.from("profiles").update({
      diretoria_id: editForm.role === "diretor" ? (editForm.diretoria_id || null) : null,
      unidade_id: editForm.role === "coordenador" ? (editForm.unidade_id || null) : null,
    }).eq("id", editUser.id);

    toast({ title: "Usuário atualizado com sucesso!" });
    setEditUser(null);
    setSaving(false);
    loadData();
  };

  const handleRequest = async (requestId: string, action: "aprovar" | "rejeitar") => {
    setProcessing(requestId);
    const { data, error } = await supabase.functions.invoke("approve-registration", { body: { request_id: requestId, action } });
    if (error || !data?.success) {
      toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
      setProcessing(null);
      return;
    }
    toast({ title: action === "aprovar" ? "Usuário aprovado e criado!" : "Solicitação rejeitada." });
    setProcessing(null);
    loadData();
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(userId);
    const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
    if (error || !data?.success) {
      toast({ title: "Erro ao excluir", description: data?.error || error?.message, variant: "destructive" });
      setDeleting(null);
      return;
    }
    toast({ title: "Usuário excluído com sucesso!" });
    setDeleting(null);
    loadData();
  };

  const pendingRequests = requests.filter(r => r.status === "pendente");
  const onlineCount = profiles.filter(p => isOnline(p.last_seen_at)).length;

  // Helper to get location label
  const getLocationLabel = (profile: ProfileRow, userRoles: string[]) => {
    if (userRoles.includes("diretor") && profile.diretoria_id) {
      return diretorias.find(d => d.id === profile.diretoria_id)?.nome || null;
    }
    if (userRoles.includes("coordenador") && profile.unidade_id) {
      const u = unidades.find(u => u.id === profile.unidade_id);
      return u ? `${u.nome} (${u.sigla})` : null;
    }
    return null;
  };

  // Selector component for role-based assignment
  const RoleAssignment = ({ role, diretoriaId, unidadeId, onDiretoriaChange, onUnidadeChange }: {
    role: string; diretoriaId: string; unidadeId: string;
    onDiretoriaChange: (v: string) => void; onUnidadeChange: (v: string) => void;
  }) => {
    if (role === "admin") return null;
    if (role === "diretor") return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Diretoria do Diretor
        </label>
        <select value={diretoriaId} onChange={e => onDiretoriaChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
          <option value="">— Selecione a diretoria —</option>
          {diretorias.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <p className="text-[10px] text-muted-foreground">O diretor verá todos os dados desta diretoria.</p>
      </div>
    );
    if (role === "coordenador") return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Unidade do Coordenador
        </label>
        <select value={unidadeId} onChange={e => onUnidadeChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
          <option value="">— Selecione a unidade —</option>
          {unidades.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>)}
        </select>
        <p className="text-[10px] text-muted-foreground">O coordenador verá apenas os dados desta unidade.</p>
      </div>
    );
    return null;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </Link>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-foreground">Gerenciar Usuários</h1>
                  <p className="text-xs text-muted-foreground">
                    {profiles.length} usuários • <span className="text-green-500">{onlineCount} online</span>
                    {pendingRequests.length > 0 && <span className="text-amber-500 ml-2">• {pendingRequests.length} pendente(s)</span>}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Novo Usuário</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Solicitações Pendentes ({pendingRequests.length})
            </h2>
            {pendingRequests.map(req => (
              <div key={req.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{req.nome || req.email}</p>
                    <p className="text-xs text-muted-foreground">{req.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${roleColor[req.role_requested] || "bg-muted text-muted-foreground"}`}>
                        {req.role_requested === "diretor" && <Building2 className="h-3 w-3 mr-1" />}
                        {req.role_requested === "coordenador" && <Users className="h-3 w-3 mr-1" />}
                        {roleLabel[req.role_requested] || req.role_requested}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleRequest(req.id, "aprovar")} disabled={processing === req.id}
                      className="flex items-center gap-1 h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                      {processing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Aprovar
                    </button>
                    <button onClick={() => handleRequest(req.id, "rejeitar")} disabled={processing === req.id}
                      className="flex items-center gap-1 h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
                      <XCircle className="h-3 w-3" /> Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Criar Novo Usuário</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Senha *</label>
                <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Papel *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                  <option value="coordenador">Coordenador</option>
                  <option value="diretor">Diretor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <RoleAssignment role={form.role} diretoriaId={form.diretoria_id} unidadeId={form.unidade_id}
              onDiretoriaChange={v => setForm(f => ({ ...f, diretoria_id: v }))}
              onUnidadeChange={v => setForm(f => ({ ...f, unidade_id: v }))} />
            <div className="flex items-center gap-2">
              <button onClick={createUser} disabled={creating}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {creating ? "Criando..." : "Criar Usuário"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Editar Usuário</h2>
                <button onClick={() => setEditUser(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground">{editUser.email}</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Papel</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                    <option value="coordenador">Coordenador</option>
                    <option value="diretor">Diretor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <RoleAssignment role={editForm.role} diretoriaId={editForm.diretoria_id} unidadeId={editForm.unidade_id}
                  onDiretoriaChange={v => setEditForm(f => ({ ...f, diretoria_id: v }))}
                  onUnidadeChange={v => setEditForm(f => ({ ...f, unidade_id: v }))} />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nova Senha (deixe vazio para manter)</label>
                  <input type="text" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.acesso_financeiro} onChange={e => setEditForm(f => ({ ...f, acesso_financeiro: e.target.checked }))} className="h-4 w-4 rounded border-input" />
                    <span className="text-xs font-medium text-foreground">Acesso à parte financeira (folha, salários)</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={saveEdit} disabled={saving}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setEditUser(null)} className="text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Users list */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">Usuários Ativos</h2>
          {profiles.map(p => {
            const userRoles = getRoles(p.id);
            const online = isOnline(p.last_seen_at);
            const locationLabel = getLocationLabel(p, userRoles);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">{(p.nome || p.email).charAt(0).toUpperCase()}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.nome || p.email}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                    {locationLabel && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {locationLabel}
                      </p>
                    )}
                    {!locationLabel && userRoles.some(r => r !== "admin") && (
                      <p className="text-[10px] text-amber-500 mt-0.5">⚠ Sem pasta vinculada</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {userRoles.map(r => (
                    <span key={r} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${roleColor[r] || "bg-muted text-muted-foreground"}`}>
                      {r === "admin" && <Shield className="h-3 w-3" />}
                      {r === "diretor" && <Building2 className="h-3 w-3" />}
                      {r === "coordenador" && <Users className="h-3 w-3" />}
                      {roleLabel[r] || r}
                    </span>
                  ))}
                  {p.acesso_financeiro && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">💰 Financeiro</span>
                  )}
                  <button onClick={() => openEdit(p)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteUser(p.id, p.nome || p.email)} disabled={deleting === p.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-50" title="Excluir">
                    {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
          {profiles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum usuário cadastrado ainda.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
