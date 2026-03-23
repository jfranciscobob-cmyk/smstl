import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2, Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";

type FeedbackState = {
  type: "error" | "success";
  message: string;
} | null;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Register form
  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"diretor" | "coordenador" | "coordenador_geral">("coordenador");
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
    setFeedback(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFeedback({ type: "error", message: error.message });
      setLoading(false);
      return;
    }

    navigate("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!regEmail || !regPassword || regPassword.length < 6) {
      setFeedback({ type: "error", message: "Preencha email e senha com no mínimo 6 caracteres." });
      return;
    }

    setSubmitting(true);

    try {
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
        setFeedback({
          type: "error",
          message: data?.error || error?.message || "Não foi possível enviar a solicitação.",
        });
        return;
      }

      setRegNome("");
      setRegEmail("");
      setRegPassword("");
      setRegDiretoriaId("");
      setMode("login");
      setFeedback({
        type: "success",
        message: "Solicitação enviada com sucesso. Aguarde a aprovação da administração para acessar o sistema.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "register") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" translate="no">
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

          {feedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/20 bg-primary/10 text-foreground"
              }`}
            >
              {feedback.message}
            </div>
          )}

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
                onChange={e => setRegRole(e.target.value as "diretor" | "coordenador" | "coordenador_geral")}
                className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="coordenador">Coordenador</option>
                <option value="coordenador_geral">Coordenador Geral</option>
                <option value="diretor">Diretor</option>
              </select>
            </div>

            {diretorias.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Diretoria vinculada {regRole === "coordenador" ? "" : ""}*
                </label>
                <select
                  value={regDiretoriaId}
                  onChange={e => setRegDiretoriaId(e.target.value)}
                  required
                  className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione a diretoria</option>
                  {diretorias.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  {regRole === "coordenador"
                    ? "O diretor desta pasta receberá sua solicitação para aprovação."
                    : regRole === "coordenador_geral"
                    ? "Selecione a diretoria principal. Coordenador Geral tem acesso de diretor."
                    : "Selecione a diretoria que você irá gerenciar."}
                </p>
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4" translate="no">
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

        {feedback && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/10 text-foreground"
            }`}
          >
            {feedback.message}
          </div>
        )}

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
            Diretores, coordenadores gerais e coordenadores podem solicitar acesso. A aprovação é feita pela administração.
          </p>
        </div>
      </div>
    </div>
  );
}
