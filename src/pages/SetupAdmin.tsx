import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SetupAdminProps {
  onDone: () => void;
}

export default function SetupAdmin({ onDone }: SetupAdminProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || password.length < 6) {
      toast({ title: "Preencha email e senha (mín. 6 caracteres)", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email, password, nome: nome || email, role: "admin" },
    });

    if (error || !data?.success) {
      toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Auto-login
    await supabase.auth.signInWithPassword({ email, password });
    toast({ title: "Admin criado! Bem-vindo ao sistema." });
    onDone();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/30">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Configuração Inicial</h1>
          <p className="mt-2 text-sm text-muted-foreground">Crie o primeiro administrador do sistema</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
              className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@exemplo.com" required
              className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required
              className="w-full h-11 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Criando..." : "Criar Administrador"}
          </button>
        </form>
      </div>
    </div>
  );
}
