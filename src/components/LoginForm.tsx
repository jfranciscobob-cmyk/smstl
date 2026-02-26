import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Shield, LogIn, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setSuccess("Cadastro realizado! Verifique seu email para confirmar.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Saúde Três Lagoas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão de Servidores</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-status-present">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Cadastre-se" : "Fazer login"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
