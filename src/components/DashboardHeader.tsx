import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Network, LogOut, UserPlus, Key, ArrowRightLeft, BookOpen, Circle } from "lucide-react";
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
  const [onlineCount, setOnlineCount] = useState(0);
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

    // Load online users count
    const loadOnline = async () => {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", twoMinAgo);
      setOnlineCount(count ?? 0);
    };
    loadOnline();
    const onlineInterval = setInterval(loadOnline, 30_000);

    const channel = supabase
      .channel("transferencias-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "transferencias" }, () => {
        loadCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); clearInterval(onlineInterval); };
  }, []);

  return (
    <>
      <header className="gradient-hero sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25 flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-primary-foreground tracking-tight truncate">
                  SMS Três Lagoas
                </h1>
                <p className="text-[10px] text-primary-foreground/50 font-medium hidden sm:block">
                  Gestão de Servidores
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-2 mr-2">
                <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-medium text-primary-foreground/40">
                  {onlineCount} online
                </span>
              </div>

              {/* Transferências */}
              {(hasFullAccess || isDiretor) && (
                <button
                  onClick={() => setShowTransferencias(true)}
                  className="relative flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-2 sm:px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Transferências</span>
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
                  className="flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-2 sm:px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Novo Servidor</span>
                </button>
              )}

              {hasFullAccess && (
                <Link
                  to="/estrutura"
                  className="flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-2 sm:px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <Network className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Estrutura</span>
                </Link>
              )}

              {hasFullAccess && (
                <Link
                  to="/admin/usuarios"
                  className="hidden sm:flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-2 sm:px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Usuários</span>
                </Link>
              )}

              <Link
                to="/manual"
                className="hidden sm:flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 px-2 sm:px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 transition-all"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Manual</span>
              </Link>

              <div className="hidden md:flex items-center gap-2 ml-1 pl-1 sm:ml-2 sm:pl-2 border-l border-primary-foreground/10">
                <div className="h-7 w-7 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">
                    {userEmail?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] text-primary-foreground/50 max-w-[120px] truncate hidden lg:block">{userEmail}</span>
              </div>

              <button
                onClick={onSignOut}
                className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all"
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
