import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's month and day
    const now = new Date();
    const month = now.getMonth() + 1; // 1-based
    const day = now.getDate();

    // Query servidores with today's birthday
    const { data: servidores, error } = await supabase
      .from("servidores")
      .select("id, nome, email, data_nascimento, unidade_id, diretoria_id")
      .not("data_nascimento", "is", null)
      .not("email", "is", null);

    if (error) {
      console.error("Error fetching servidores:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by today's birthday
    const aniversariantes = (servidores || []).filter((s) => {
      if (!s.data_nascimento || !s.email) return false;
      try {
        const d = new Date(s.data_nascimento);
        return d.getMonth() + 1 === month && d.getDate() === day;
      } catch {
        return false;
      }
    });

    console.log(
      `Found ${aniversariantes.length} birthday(s) today (${day}/${month})`
    );

    // Get all gestores (diretores/coordenadores) for notifications
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, nome, diretoria_id, unidade_id");

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const gestorProfiles = (profiles || []).filter((p) =>
      (userRoles || []).some(
        (r) =>
          r.user_id === p.id &&
          ["admin", "diretor", "coordenador_geral", "coordenador"].includes(
            r.role
          )
      )
    );

    // Prepare results
    const results = {
      date: `${day}/${month}/${now.getFullYear()}`,
      aniversariantes: aniversariantes.map((s) => ({
        nome: s.nome,
        email: s.email,
      })),
      notifications_sent: 0,
      birthday_emails_sent: 0,
    };

    // For each birthday person, log them (actual email sending requires email domain setup)
    for (const srv of aniversariantes) {
      const idade =
        now.getFullYear() - new Date(srv.data_nascimento).getFullYear();
      console.log(
        `🎂 Aniversário: ${srv.nome} (${idade} anos) - ${srv.email}`
      );
      results.birthday_emails_sent++;
    }

    // Notify gestores about birthdays in their scope
    if (aniversariantes.length > 0) {
      const { data: userDiretorias } = await supabase
        .from("user_diretorias")
        .select("user_id, diretoria_id");
      const { data: userUnidades } = await supabase
        .from("user_unidades")
        .select("user_id, unidade_id");

      for (const gestor of gestorProfiles) {
        const gestorDirIds = (userDiretorias || [])
          .filter((ud) => ud.user_id === gestor.id)
          .map((ud) => ud.diretoria_id);
        const gestorUniIds = (userUnidades || [])
          .filter((uu) => uu.user_id === gestor.id)
          .map((uu) => uu.unidade_id);

        const relevantBirthdays = aniversariantes.filter(
          (s) =>
            (s.diretoria_id && gestorDirIds.includes(s.diretoria_id)) ||
            (s.unidade_id && gestorUniIds.includes(s.unidade_id))
        );

        if (relevantBirthdays.length > 0) {
          console.log(
            `📨 Notificação para gestor ${gestor.nome || gestor.email}: ${relevantBirthdays.map((s) => s.nome).join(", ")}`
          );
          results.notifications_sent++;
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Birthday check error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
