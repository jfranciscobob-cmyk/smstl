import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserRole {
  role: "admin" | "diretor" | "coordenador";
}

export interface AuthSession {
  user: User | null;
  roles: UserRole[];
  servidorId: string | null;
  diretoriaId: string | null;
  unidadeId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isDiretor: boolean;
  isCoordenador: boolean;
  hasFullAccess: boolean;
  hasFinancialAccess: boolean;
  signOut: () => Promise<void>;
}

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [servidorId, setServidorId] = useState<string | null>(null);
  const [diretoriaId, setDiretoriaId] = useState<string | null>(null);
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [acessoFinanceiro, setAcessoFinanceiro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let authListenerReady = false;

    const safetyTimer = window.setTimeout(() => {
      if (isActive) {
        console.warn("[useAuthSession] safety timeout reached");
        setLoading(false);
      }
    }, 8000);

    const loadAuthData = async (currentUser: User | null) => {
      try {
        if (!isActive) return;

        setUser(currentUser);

        if (!currentUser) {
          setRoles([]);
          setServidorId(null);
          setDiretoriaId(null);
          setUnidadeId(null);
          setAcessoFinanceiro(false);
          return;
        }

        const [rolesResult, profileResult] = await Promise.allSettled([
          supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
          supabase
            .from("profiles")
            .select("servidor_id, acesso_financeiro, diretoria_id, unidade_id")
            .eq("id", currentUser.id)
            .maybeSingle(),
        ]);

        if (!isActive) return;

        if (rolesResult.status === "fulfilled") {
          setRoles((rolesResult.value.data ?? []) as UserRole[]);
        } else {
          console.error("[useAuthSession/roles] error:", rolesResult.reason);
          setRoles([]);
        }

        if (profileResult.status === "fulfilled") {
          setServidorId(profileResult.value.data?.servidor_id ?? null);
          setDiretoriaId(profileResult.value.data?.diretoria_id ?? null);
          setUnidadeId(profileResult.value.data?.unidade_id ?? null);
          setAcessoFinanceiro(profileResult.value.data?.acesso_financeiro ?? false);
        } else {
          console.error("[useAuthSession/profile] error:", profileResult.reason);
          setServidorId(null);
          setDiretoriaId(null);
          setUnidadeId(null);
          setAcessoFinanceiro(false);
        }
      } catch (err) {
        console.error("[useAuthSession] error:", err);
        if (!isActive) return;
        setRoles([]);
        setServidorId(null);
        setDiretoriaId(null);
        setUnidadeId(null);
        setAcessoFinanceiro(false);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authListenerReady = true;
      window.setTimeout(() => {
        void loadAuthData(session?.user ?? null);
      }, 0);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!authListenerReady) {
          void loadAuthData(session?.user ?? null);
        }
      })
      .catch((err) => {
        console.error("[useAuthSession/getSession] error:", err);
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.some((r) => r.role === "admin");
  const isDiretor = roles.some((r) => r.role === "diretor");
  const isCoordenador = roles.some((r) => r.role === "coordenador");
  const hasFullAccess = isAdmin || isDiretor;
  const hasFinancialAccess = isAdmin || acessoFinanceiro;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, roles, servidorId, loading, isAdmin, isDiretor, isCoordenador, hasFullAccess, hasFinancialAccess, signOut };
}

