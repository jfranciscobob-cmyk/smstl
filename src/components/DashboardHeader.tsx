import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Network, LogOut, UserPlus, Key, ArrowRightLeft, Bell, BookOpen } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { supabase } from "@/integrations/supabase/client";
import type { DiretoriaDB, ServidorDB } from "@/hooks/useServidores";
import { TransferenciasPendentes } from "./TransferenciasPendentes";

interface DashboardHeaderProps {
  userEmail?: string;
  onSignOut: () => void;
  onCreateServidor: () => void;
  diretorias?: DiretoriaDB[];
  servidores?: ServidorDB[];
}

export function DashboardHeader({ userEmail, onSignOut, onCreateServidor, diretorias = [], servidores = [] }: DashboardHeaderProps) {
  const { hasFullAccess, user, isAdmin, isDiretor, servidorId } = useAuthSession();
  const [pendingCount, setPendingCount] = useState(0);
  const [showTransferencias, setShowTransferencias] = useState(false);

  // Find user's diretoria (if they are a director)
  const userServidor = servidores.find(s => s.id === servidorId);
  const userDiretoriaId = userServidor?.diretoria_id || null;

  useEffect(() => {
    const loadCount = async () => {
      const { count, error } = await supabase
        .from("transferencias")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente");
      if (!error) setPendingCount(count ?? 0);
    };
    loadCount();

    const channel = supabase
      .channel("transferencias-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "transferencias" }, () => {
        loadCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      <header className="gradient-hero sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
                  Secretaria Municipal de Saúde
                </h1>
                <p className="text-xs text-primary-foreground/50 font-medium">
                  Três Lagoas — Gestão de Servidores
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 md:flex mr-2">
                <div className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-[11px] font-medium text-primary-foreground/40">Tempo real</span>
              </div>

              {/* Transferências */}
              {(hasFullAccess || isDiretor) && (
                <button
                  onClick={() => setShowTransferencias(true)}
                  className="relative flex h-9 items-center gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Transferências</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              
              {hasFullAccess && (
                <button
                  onClick={onCreateServidor}
                  className="flex h-9 items-center gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Novo Servidor</span>
                </button>
              )}

              {hasFullAccess && (
                <Link
                  to="/estrutura"
                  className="flex h-9 items-center gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <Network className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Estrutura</span>
                </Link>
              )}

              {hasFullAccess && (
                <Link
                  to="/admin/usuarios"
                  className="flex h-9 items-center gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Usuários</span>
                </Link>
              )}

              <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-primary-foreground/10">
                <div className="h-7 w-7 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">
                    {userEmail?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] text-primary-foreground/50 max-w-[120px] truncate">{userEmail}</span>
              </div>

              <button
                onClick={onSignOut}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <TransferenciasPendentes
        open={showTransferencias}
        onClose={() => setShowTransferencias(false)}
        diretorias={diretorias}
        servidores={servidores}
        userId={user?.id || ""}
        userDiretoriaId={userDiretoriaId}
        isAdmin={isAdmin}
        onTransferApproved={() => {}}
      />
    </>
  );
}
