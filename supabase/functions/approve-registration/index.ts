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

    const isAdmin = roles?.some(r => r.role === "admin");
    const isDiretor = roles?.some(r => r.role === "diretor");
    const isCoordenadorGeral = roles?.some(r => r.role === "coordenador_geral");
    if (!isAdmin && !isDiretor && !isCoordenadorGeral) throw new Error("Sem permissão");

    const { request_id, action, motivo_rejeicao } = await req.json();

    if (!request_id || !action) throw new Error("Dados incompletos");
    if (!["aprovar", "rejeitar"].includes(action)) throw new Error("Ação inválida");

    // Get the request
    const { data: request, error: reqError } = await supabase
      .from("registration_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !request) throw new Error("Solicitação não encontrada");
    if (request.status !== "pendente") throw new Error("Solicitação já foi respondida");

    // Diretor can only approve coordenador requests
    if (isDiretor && !isAdmin && request.role_requested === "diretor") {
      throw new Error("Apenas administradores podem aprovar diretores");
    }

    if (action === "rejeitar") {
      await supabase
        .from("registration_requests")
        .update({
          status: "rejeitado",
          respondido_por: callingUser.id,
          respondido_at: new Date().toISOString(),
          motivo_rejeicao: motivo_rejeicao || null,
        })
        .eq("id", request_id);

      return new Response(
        JSON.stringify({ success: true, action: "rejeitado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve: create the user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: request.email,
      password: request.senha,
      email_confirm: true,
      user_metadata: { nome: request.nome || request.email },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Falha ao criar usuário");

    // Assign role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: newUser.user.id,
      role: request.role_requested,
    });

    if (roleError) throw roleError;

    // Update request status
    await supabase
      .from("registration_requests")
      .update({
        status: "aprovado",
        respondido_por: callingUser.id,
        respondido_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    return new Response(
      JSON.stringify({ success: true, action: "aprovado", user_id: newUser.user.id }),
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
