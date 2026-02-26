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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Fetch roles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id);
        setRoles((rolesData ?? []) as UserRole[]);

        // Fetch profile for servidor_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("servidor_id")
          .eq("id", currentUser.id)
          .single();
        setServidorId(profile?.servidor_id ?? null);
      } else {
        setRoles([]);
        setServidorId(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
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
