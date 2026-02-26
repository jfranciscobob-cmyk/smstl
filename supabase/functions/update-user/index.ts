import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Verify calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !callingUser) throw new Error("Não autorizado");

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);

    const isAdmin = callerRoles?.some(r => r.role === "admin" || r.role === "diretor");
    if (!isAdmin) throw new Error("Sem permissão");

    const { user_id, nome, password, role, acesso_financeiro } = await req.json();
    if (!user_id) throw new Error("user_id é obrigatório");

    // Update auth user (name and/or password)
    const updatePayload: Record<string, unknown> = {};
    if (password && password.length >= 6) {
      updatePayload.password = password;
    }
    if (nome !== undefined) {
      updatePayload.user_metadata = { nome };
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, updatePayload);
      if (updateError) throw updateError;
    }

    // Update profile name
    if (nome !== undefined) {
      await supabase.from("profiles").update({ nome }).eq("id", user_id);
    }

    // Update role if provided
    if (role && ["admin", "diretor", "coordenador"].includes(role)) {
      // Remove existing roles and set new one
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      const { error: roleError } = await supabase.from("user_roles").insert({ user_id, role });
      if (roleError) throw roleError;
    }

    return new Response(
      JSON.stringify({ success: true }),
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
