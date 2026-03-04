import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserRole {
  role: "admin" | "diretor" | "coordenador" | "coordenador_geral";
}

export interface AuthSession {
  user: User | null;
  roles: UserRole[];
  servidorId: string | null;
  diretoriaIds: string[];
  unidadeIds: string[];
  loading: boolean;
  isAdmin: boolean;
  isDiretor: boolean;
  isCoordenador: boolean;
  isCoordenadorGeral: boolean;
  hasFullAccess: boolean;
  hasFinancialAccess: boolean;
  signOut: () => Promise<void>;
  /** @deprecated Use diretoriaIds instead */
  diretoriaId: string | null;
  /** @deprecated Use unidadeIds instead */
  unidadeId: string | null;
}

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [servidorId, setServidorId] = useState<string | null>(null);
  const [diretoriaIds, setDiretoriaIds] = useState<string[]>([]);
  const [unidadeIds, setUnidadeIds] = useState<string[]>([]);
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
          setDiretoriaIds([]);
          setUnidadeIds([]);
          setAcessoFinanceiro(false);
          return;
        }

        const [rolesResult, profileResult, userDiretoriasResult, userUnidadesResult] = await Promise.allSettled([
          supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
          supabase
            .from("profiles")
            .select("servidor_id, acesso_financeiro")
            .eq("id", currentUser.id)
            .maybeSingle(),
          supabase.from("user_diretorias").select("diretoria_id").eq("user_id", currentUser.id),
          supabase.from("user_unidades").select("unidade_id").eq("user_id", currentUser.id),
        ]);

        if (!isActive) return;

        if (rolesResult.status === "fulfilled") {
          setRoles((rolesResult.value.data ?? []) as UserRole[]);
        } else {
          setRoles([]);
        }

        if (profileResult.status === "fulfilled") {
          setServidorId(profileResult.value.data?.servidor_id ?? null);
          setAcessoFinanceiro(profileResult.value.data?.acesso_financeiro ?? false);
        } else {
          setServidorId(null);
          setAcessoFinanceiro(false);
        }

        if (userDiretoriasResult.status === "fulfilled") {
          setDiretoriaIds((userDiretoriasResult.value.data ?? []).map((d: any) => d.diretoria_id));
        } else {
          setDiretoriaIds([]);
        }

        if (userUnidadesResult.status === "fulfilled") {
          setUnidadeIds((userUnidadesResult.value.data ?? []).map((u: any) => u.unidade_id));
        } else {
          setUnidadeIds([]);
        }
      } catch (err) {
        console.error("[useAuthSession] error:", err);
        if (!isActive) return;
        setRoles([]);
        setServidorId(null);
        setDiretoriaIds([]);
        setUnidadeIds([]);
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
  const isCoordenadorGeral = roles.some((r) => r.role === "coordenador_geral");
  const hasFullAccess = isAdmin || isDiretor || isCoordenadorGeral;
  const hasFinancialAccess = isAdmin || acessoFinanceiro;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user, roles, servidorId,
    diretoriaIds, unidadeIds,
    // backwards compat
    diretoriaId: diretoriaIds[0] ?? null,
    unidadeId: unidadeIds[0] ?? null,
    loading, isAdmin, isDiretor, isCoordenador, hasFullAccess, hasFinancialAccess, signOut,
  };
}
