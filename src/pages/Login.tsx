import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2, Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Register form
  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"diretor" | "coordenador">("coordenador");
  const [diretorias, setDiretorias] = useState<{ id: string; nome: string }[]>([]);
  const [regDiretoriaId, setRegDiretoriaId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "register") {
      supabase.from("diretorias").select("id, nome").order("nome").then(({ data }) => {
        setDiretorias(data ?? []);
      });
    }
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Login realizado com sucesso!" });
    navigate("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || regPassword.length < 6) {
      toast({ title: "Preencha email e senha (mín. 6 caracteres)", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("request-registration", {
      body: {
        email: regEmail,
        nome: regNome,
        senha: regPassword,
        role_requested: regRole,
        diretoria_id: regDiretoriaId || null,
      },
    });

    if (error || !data?.success) {
      toast({ title: "Erro ao solicitar", description: data?.error || error?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({
      title: "Solicitação enviada!",
      description: "Aguarde a aprovação de um administrador ou diretor para acessar o sistema.",
    });
    setMode("login");
    setSubmitting(false);
    setRegNome("");
    setRegEmail("");
    setRegPassword("");
  };

  if (mode === "register") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/30">
              <UserPlus className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-foreground">Solicitar Acesso</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Preencha seus dados para solicitar acesso ao sistema
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <input
                type="text"
                value={regNome}
                onChange={e => setRegNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full h-11 rounded-lg border border-input bg-card px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Papel *</label>
              <select
                value={regRole}
                onChange={e => setRegRole(e.target.value as "diretor" | "coordenador")}
                className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="coordenador">Coordenador</option>
                <option value="diretor">Diretor</option>
              </select>
            </div>

            {regRole === "coordenador" && diretorias.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Diretoria vinculada</label>
                <select
                  value={regDiretoriaId}
                  onChange={e => setRegDiretoriaId(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione (opcional)</option>
                  {diretorias.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {submitting ? "Enviando..." : "Solicitar Acesso"}
            </button>
          </form>

          <button
            onClick={() => setMode("login")}
            className="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/30">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">SMS - Saúde</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistema de Gestão de Servidores
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              required
              className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 rounded-lg border border-input bg-card px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <button
            onClick={() => setMode("register")}
            className="text-sm text-primary hover:underline font-medium flex items-center gap-2 mx-auto"
          >
            <UserPlus className="h-4 w-4" /> Solicitar acesso ao sistema
          </button>
          <p className="text-xs text-muted-foreground">
            Diretores e coordenadores podem solicitar acesso. A aprovação é feita pela administração.
          </p>
        </div>
      </div>
    </div>
  );
}
