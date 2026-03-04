import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, UserPlus, Shield, Building2, Users, Pencil, Key, X, Check, XCircle, Clock, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthSession } from "@/hooks/useAuthSession";

interface ProfileRow {
  id: string;
  email: string;
  nome: string | null;
  servidor_id: string | null;
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
interface UnidadeOption { id: string; nome: string; sigla: string; diretoria_id: string; agrupamento_id: string | null; }
interface AgrupamentoOption { id: string; nome: string; diretoria_id: string; }
interface UserDiretoria { id: string; user_id: string; diretoria_id: string; }
interface UserUnidade { id: string; user_id: string; unidade_id: string; }

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 2 * 60 * 1000;
}

export default function AdminUsuarios() {
  const { toast } = useToast();
  const { isAdmin, isDiretor, diretoriaIds: authDiretoriaIds } = useAuthSession();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [diretorias, setDiretorias] = useState<DiretoriaOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [agrupamentos, setAgrupamentos] = useState<AgrupamentoOption[]>([]);
  const [userDiretorias, setUserDiretorias] = useState<UserDiretoria[]>([]);
  const [userUnidades, setUserUnidades] = useState<UserUnidade[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "coordenador" });
  const [formDiretoriaIds, setFormDiretoriaIds] = useState<Set<string>>(new Set());
  const [formUnidadeIds, setFormUnidadeIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const [editUser, setEditUser] = useState<ProfileRow | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", role: "", password: "", acesso_financeiro: false });
  const [editDiretoriaIds, setEditDiretoriaIds] = useState<Set<string>>(new Set());
  const [editUnidadeIds, setEditUnidadeIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [p, r, req, dir, uni, agr, ud, uu] = await Promise.all([
      supabase.from("profiles").select("id, email, nome, servidor_id, acesso_financeiro, created_at, last_seen_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("registration_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("diretorias").select("id, nome").order("nome"),
      supabase.from("unidades").select("id, nome, sigla, diretoria_id, agrupamento_id").order("nome"),
      supabase.from("agrupamentos").select("id, nome, diretoria_id").order("nome"),
      supabase.from("user_diretorias").select("*"),
      supabase.from("user_unidades").select("*"),
    ]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setRequests((req.data ?? []) as RegistrationRequest[]);
    setDiretorias((dir.data ?? []) as DiretoriaOption[]);
    setUnidades((uni.data ?? []) as UnidadeOption[]);
    setAgrupamentos((agr.data ?? []) as AgrupamentoOption[]);
    setUserDiretorias((ud.data ?? []) as UserDiretoria[]);
    setUserUnidades((uu.data ?? []) as UserUnidade[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getRoles = (userId: string) => roles.filter(r => r.user_id === userId).map(r => r.role);
  const getUserDiretoriaIds = (userId: string) => userDiretorias.filter(ud => ud.user_id === userId).map(ud => ud.diretoria_id);
  const getUserUnidadeIds = (userId: string) => userUnidades.filter(uu => uu.user_id === userId).map(uu => uu.unidade_id);

  const roleLabel: Record<string, string> = { admin: "Administrador", diretor: "Diretor", coordenador_geral: "Coordenador Geral", coordenador: "Coordenador" };
  const roleColor: Record<string, string> = { admin: "bg-primary/10 text-primary", diretor: "bg-amber-500/10 text-amber-600", coordenador_geral: "bg-teal-500/10 text-teal-600", coordenador: "bg-accent text-accent-foreground" };

  const syncUserDiretorias = async (userId: string, newIds: Set<string>) => {
    await supabase.from("user_diretorias").delete().eq("user_id", userId);
    if (newIds.size > 0) {
      const rows = Array.from(newIds).map(diretoria_id => ({ user_id: userId, diretoria_id }));
      await supabase.from("user_diretorias").insert(rows);
    }
  };

  const syncUserUnidades = async (userId: string, newIds: Set<string>) => {
    await supabase.from("user_unidades").delete().eq("user_id", userId);
    if (newIds.size > 0) {
      const rows = Array.from(newIds).map(unidade_id => ({ user_id: userId, unidade_id }));
      await supabase.from("user_unidades").insert(rows);
    }
  };

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
    const newUserId = data.user_id;
    if (newUserId) {
      if (form.role === "diretor") await syncUserDiretorias(newUserId, formDiretoriaIds);
      if (form.role === "coordenador") await syncUserUnidades(newUserId, formUnidadeIds);
    }
    toast({ title: "Usuário criado com sucesso!" });
    setShowForm(false);
    setForm({ email: "", password: "", nome: "", role: "coordenador" });
    setFormDiretoriaIds(new Set());
    setFormUnidadeIds(new Set());
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
    });
    setEditDiretoriaIds(new Set(getUserDiretoriaIds(profile.id)));
    setEditUnidadeIds(new Set(getUserUnidadeIds(profile.id)));
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
    // Sync pastas
    if (editForm.role === "diretor") {
      await syncUserDiretorias(editUser.id, editDiretoriaIds);
      await syncUserUnidades(editUser.id, new Set()); // clear unidades
    } else if (editForm.role === "coordenador") {
      await syncUserUnidades(editUser.id, editUnidadeIds);
      await syncUserDiretorias(editUser.id, new Set()); // clear diretorias
    } else {
      // admin - clear both
      await syncUserDiretorias(editUser.id, new Set());
      await syncUserUnidades(editUser.id, new Set());
    }

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

  const pendingRequests = requests.filter(r => {
    if (r.status !== "pendente") return false;
    // Admin sees all, director sees only requests for their diretorias
    if (isAdmin) return true;
    if (isDiretor && r.diretoria_id && authDiretoriaIds.includes(r.diretoria_id)) return true;
    // Directors also see requests without diretoria (coordenador requests)
    if (isDiretor && !r.diretoria_id) return false;
    return isAdmin; // fallback
  });
  const onlineCount = profiles.filter(p => isOnline(p.last_seen_at)).length;

  // Helper to get location labels
  const getLocationLabels = (userId: string, userRoles: string[]) => {
    const labels: string[] = [];
    if (userRoles.includes("diretor")) {
      const ids = getUserDiretoriaIds(userId);
      ids.forEach(id => {
        const d = diretorias.find(d => d.id === id);
        if (d) labels.push(d.nome);
      });
    }
    if (userRoles.includes("coordenador")) {
      const ids = getUserUnidadeIds(userId);
      ids.forEach(id => {
        const u = unidades.find(u => u.id === id);
        if (u) labels.push(`${u.nome} (${u.sigla})`);
      });
    }
    return labels;
  };

  // Multi-select checkbox component for pastas
  const MultiPastaSelector = ({ role, diretoriaIds, unidadeIds, onDiretoriasChange, onUnidadesChange }: {
    role: string; diretoriaIds: Set<string>; unidadeIds: Set<string>;
    onDiretoriasChange: (ids: Set<string>) => void; onUnidadesChange: (ids: Set<string>) => void;
  }) => {
    if (role === "admin") return null;
    if (role === "diretor") return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Diretorias do Diretor (múltiplas)
        </label>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-input bg-card p-2 space-y-1">
          {diretorias.map(d => (
            <label key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
              <Checkbox
                checked={diretoriaIds.has(d.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(diretoriaIds);
                  if (checked) next.add(d.id); else next.delete(d.id);
                  onDiretoriasChange(next);
                }}
              />
              {d.nome}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">O diretor verá os dados de todas as diretorias selecionadas.</p>
      </div>
    );
    if (role === "coordenador") {
      // Group unidades by diretoria > agrupamento
      const dirGroups = diretorias.map(dir => {
        const dirUnidades = unidades.filter(u => u.diretoria_id === dir.id);
        const dirAgrupamentos = agrupamentos.filter(a => a.diretoria_id === dir.id);
        const agrupGroups = dirAgrupamentos.map(agr => ({
          agrupamento: agr,
          units: dirUnidades.filter(u => u.agrupamento_id === agr.id),
        })).filter(g => g.units.length > 0);
        const semAgrupamento = dirUnidades.filter(u => !u.agrupamento_id);
        return { diretoria: dir, agrupGroups, semAgrupamento, allUnits: dirUnidades };
      }).filter(g => g.allUnits.length > 0);

      const toggleAll = (unitIds: string[], checked: boolean) => {
        const next = new Set(unidadeIds);
        unitIds.forEach(id => { if (checked) next.add(id); else next.delete(id); });
        onUnidadesChange(next);
      };

      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Unidades do Coordenador (múltiplas)
          </label>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-input bg-card p-2 space-y-1">
            {dirGroups.map(dg => {
              const allDirIds = dg.allUnits.map(u => u.id);
              const allDirChecked = allDirIds.length > 0 && allDirIds.every(id => unidadeIds.has(id));
              const someDirChecked = !allDirChecked && allDirIds.some(id => unidadeIds.has(id));
              const selectedCount = allDirIds.filter(id => unidadeIds.has(id)).length;
              return (
                <div key={dg.diretoria.id} className="rounded-lg border border-border overflow-hidden mb-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-primary/10 cursor-pointer hover:bg-primary/15 transition-colors">
                    <Checkbox
                      checked={allDirChecked}
                      // @ts-ignore
                      indeterminate={someDirChecked}
                      onCheckedChange={(checked) => toggleAll(allDirIds, !!checked)}
                    />
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary flex-1">{dg.diretoria.nome}</span>
                    <span className="text-[10px] text-muted-foreground">{selectedCount}/{allDirIds.length}</span>
                  </label>
                  <div className="p-1.5 space-y-0.5">
                    {dg.agrupGroups.map(ag => {
                      const allIds = ag.units.map(u => u.id);
                      const allChecked = allIds.every(id => unidadeIds.has(id));
                      return (
                        <div key={ag.agrupamento.id} className="ml-1">
                          <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs font-semibold text-foreground">
                            <Checkbox
                              checked={allChecked}
                              onCheckedChange={(checked) => toggleAll(allIds, !!checked)}
                            />
                            📁 {ag.agrupamento.nome} ({ag.units.length})
                          </label>
                          <div className="ml-5 space-y-0.5">
                            {ag.units.map(u => (
                              <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
                                <Checkbox
                                  checked={unidadeIds.has(u.id)}
                                  onCheckedChange={(checked) => {
                                    const next = new Set(unidadeIds);
                                    if (checked) next.add(u.id); else next.delete(u.id);
                                    onUnidadesChange(next);
                                  }}
                                />
                                {u.nome} ({u.sigla})
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {dg.semAgrupamento.map(u => (
                      <label key={u.id} className="flex items-center gap-2 px-2 py-1 ml-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox
                          checked={unidadeIds.has(u.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(unidadeIds);
                            if (checked) next.add(u.id); else next.delete(u.id);
                            onUnidadesChange(next);
                          }}
                        />
                        {u.nome} ({u.sigla})
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">Marque a diretoria para selecionar todas as unidades dela, ou escolha individualmente.</p>
        </div>
      );
    }
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${roleColor[req.role_requested] || "bg-muted text-muted-foreground"}`}>
                        {req.role_requested === "diretor" && <Building2 className="h-3 w-3 mr-1" />}
                        {(req.role_requested === "coordenador" || req.role_requested === "coordenador_geral") && <Users className="h-3 w-3 mr-1" />}
                        {roleLabel[req.role_requested] || req.role_requested}
                      </span>
                      {req.diretoria_id && (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                          <MapPin className="h-3 w-3" />
                          {diretorias.find(d => d.id === req.diretoria_id)?.nome || "Diretoria"}
                        </span>
                      )}
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
                  <option value="coordenador_geral">Coordenador Geral</option>
                  <option value="diretor">Diretor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <MultiPastaSelector role={form.role} diretoriaIds={formDiretoriaIds} unidadeIds={formUnidadeIds}
              onDiretoriasChange={setFormDiretoriaIds} onUnidadesChange={setFormUnidadeIds} />
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
                    <option value="coordenador_geral">Coordenador Geral</option>
                    <option value="diretor">Diretor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <MultiPastaSelector role={editForm.role} diretoriaIds={editDiretoriaIds} unidadeIds={editUnidadeIds}
                  onDiretoriasChange={setEditDiretoriaIds} onUnidadesChange={setEditUnidadeIds} />
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
            const locationLabels = getLocationLabels(p.id, userRoles);
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
                    {locationLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {locationLabels.map((label, i) => (
                          <span key={i} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {locationLabels.length === 0 && userRoles.some(r => r !== "admin") && (
                      <p className="text-[10px] text-amber-500 mt-0.5">⚠ Sem pasta vinculada</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {userRoles.map(r => (
                    <span key={r} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${roleColor[r] || "bg-muted text-muted-foreground"}`}>
                      {r === "admin" && <Shield className="h-3 w-3" />}
                      {r === "diretor" && <Building2 className="h-3 w-3" />}
                      {(r === "coordenador" || r === "coordenador_geral") && <Users className="h-3 w-3" />}
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
