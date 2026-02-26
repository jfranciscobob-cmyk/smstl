import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, UserPlus, Shield, Building2, Users, Pencil, Key, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  email: string;
  nome: string | null;
  servidor_id: string | null;
  acesso_financeiro: boolean;
  created_at: string;
}

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
}

export default function AdminUsuarios() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "coordenador" as string });
  const [creating, setCreating] = useState(false);

  // Edit user
  const [editUser, setEditUser] = useState<ProfileRow | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", role: "", password: "", acesso_financeiro: false });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getRoles = (userId: string) => roles.filter(r => r.user_id === userId).map(r => r.role);

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    diretor: "Diretor",
    coordenador: "Coordenador",
  };

  const roleColor: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    diretor: "bg-amber-500/10 text-amber-600",
    coordenador: "bg-accent text-accent-foreground",
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

    toast({ title: "Usuário criado com sucesso!" });
    setShowForm(false);
    setForm({ email: "", password: "", nome: "", role: "coordenador" });
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
        user_id: editUser.id,
        nome: editForm.nome,
        role: editForm.role,
        password: editForm.password || undefined,
      },
    });

    if (error || !data?.success) {
      toast({ title: "Erro ao salvar", description: data?.error || error?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Usuário atualizado com sucesso!" });
    setEditUser(null);
    setSaving(false);
    loadData();
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
                  <p className="text-xs text-muted-foreground">Criar e gerenciar acessos ao sistema</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Create user form */}
        {showForm && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Criar Novo Usuário</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  required
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Senha *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Papel *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="coordenador">Coordenador</option>
                  <option value="diretor">Diretor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={createUser}
                disabled={creating}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {creating ? "Criando..." : "Criar Usuário"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Edit user modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Editar Usuário</h2>
                <button onClick={() => setEditUser(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{editUser.email}</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <input
                    value={editForm.nome}
                    onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Papel</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    <option value="coordenador">Coordenador</option>
                    <option value="diretor">Diretor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nova Senha (deixe vazio para manter)</label>
                  <input
                    type="text"
                    value={editForm.password}
                    onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setEditUser(null)} className="text-sm text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users list */}
        <div className="space-y-2">
          {profiles.map(p => {
            const userRoles = getRoles(p.id);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.nome || p.email}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
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
                  <button
                    onClick={() => openEdit(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar usuário"
                  >
                    <Pencil className="h-3.5 w-3.5" />
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
