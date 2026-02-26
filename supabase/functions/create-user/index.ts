import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if any users exist (for initial setup)
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const isInitialSetup = (count ?? 0) === 0;

    if (!isInitialSetup) {
      // Verify calling user is admin or diretor
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Não autorizado");

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !callingUser) throw new Error("Não autorizado");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callingUser.id);

      const hasPermission = roles?.some(r => r.role === "admin" || r.role === "diretor");
      if (!hasPermission) throw new Error("Sem permissão para criar usuários");
    }

    const { email, password, nome, servidor_id, role } = await req.json();

    if (!email || !password || !role) {
      throw new Error("Email, senha e papel são obrigatórios");
    }

    if (!["admin", "diretor", "coordenador"].includes(role)) {
      throw new Error("Papel inválido");
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: nome || email },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Falha ao criar usuário");

    // Link profile to servidor if provided
    if (servidor_id) {
      await supabase.from("profiles").update({ servidor_id }).eq("id", newUser.user.id);
      // Also update servidor email
      await supabase.from("servidores").update({ email }).eq("id", servidor_id);
    }

    // Assign role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
    });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
