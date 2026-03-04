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

    const { email, nome, senha, role_requested, diretoria_id } = await req.json();

    if (!email || !senha || !role_requested) {
      throw new Error("Email, senha e papel são obrigatórios");
    }

    if (senha.length < 6) {
      throw new Error("Senha deve ter no mínimo 6 caracteres");
    }

    if (!["diretor", "coordenador", "coordenador_geral"].includes(role_requested)) {
      throw new Error("Papel inválido. Apenas diretor, coordenador geral ou coordenador podem solicitar acesso.");
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    if (emailExists) {
      throw new Error("Este email já possui uma conta no sistema.");
    }

    // Check if there's already a pending request for this email
    const { data: existingRequest } = await supabase
      .from("registration_requests")
      .select("id")
      .eq("email", email)
      .eq("status", "pendente")
      .maybeSingle();

    if (existingRequest) {
      throw new Error("Já existe uma solicitação pendente para este email.");
    }

    // Insert the request
    const { error: insertError } = await supabase
      .from("registration_requests")
      .insert({
        email,
        nome: nome || "",
        senha,
        role_requested,
        diretoria_id: diretoria_id || null,
      });

    if (insertError) throw insertError;

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
