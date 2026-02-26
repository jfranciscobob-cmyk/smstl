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
  loading: boolean;
  isAdmin: boolean;
  isDiretor: boolean;
  isCoordenador: boolean;
  hasFullAccess: boolean;
  signOut: () => Promise<void>;
}

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [servidorId, setServidorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadAuthData = async (currentUser: User | null) => {
      try {
        if (!isActive) return;
        setUser(currentUser);

        if (currentUser) {
          const [{ data: rolesData }, { data: profile }] = await Promise.all([
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", currentUser.id),
            supabase
              .from("profiles")
              .select("servidor_id")
              .eq("id", currentUser.id)
              .maybeSingle(),
          ]);

          if (!isActive) return;
          setRoles((rolesData ?? []) as UserRole[]);
          setServidorId(profile?.servidor_id ?? null);
        } else {
          setRoles([]);
          setServidorId(null);
        }
      } catch (err) {
        console.error("[useAuthSession] error:", err);
        if (!isActive) return;
        setRoles([]);
        setServidorId(null);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await loadAuthData(session?.user ?? null);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => loadAuthData(session?.user ?? null))
      .catch((err) => {
        console.error("[useAuthSession/getSession] error:", err);
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.some(r => r.role === "admin");
  const isDiretor = roles.some(r => r.role === "diretor");
  const isCoordenador = roles.some(r => r.role === "coordenador");
  const hasFullAccess = isAdmin || isDiretor;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, roles, servidorId, loading, isAdmin, isDiretor, isCoordenador, hasFullAccess, signOut };
}
