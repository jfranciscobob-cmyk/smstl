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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { csvData } = await req.json();

    if (!csvData || typeof csvData !== "string") {
      throw new Error("csvData is required");
    }

    const lines = csvData.split("\n").filter((l: string) => l.trim().length > 0);
    // Skip header
    const dataLines = lines.slice(1);

    // Parse and deduplicate by name (keep first occurrence with most data)
    const servidoresMap = new Map<string, {
      nome: string;
      cargo: string;
      vinculo: string;
      carga_horaria: number;
      data_admissao: string;
      salario: number;
    }>();

    for (const line of dataLines) {
      const parts = line.split(";");
      if (parts.length < 7) continue;

      const nome = (parts[2] || "").trim();
      const vinculo = (parts[3] || "").trim();
      const cargo = (parts[5] || "").trim();
      const dataAdmissao = (parts[6] || "").trim();
      const cargaHoraria = parseInt(parts[7] || "0", 10) || 0;
      // Salário pode estar na coluna 8 ou 9 dependendo do layout
      const salarioRaw = (parts[8] || "").trim().replace(/[^\d.,]/g, "").replace(",", ".");
      const salario = parseFloat(salarioRaw) || 0;

      if (!nome) continue;

      if (!servidoresMap.has(nome)) {
        servidoresMap.set(nome, {
          nome, cargo, vinculo,
          carga_horaria: cargaHoraria,
          data_admissao: dataAdmissao,
          salario,
        });
      }
    }

    // Map vinculo to simplified version
    function mapVinculo(v: string): string {
      if (v.includes("ESTATUTARIO EFETIVO")) return "CONCURSADO (EFETIVO)";
      if (v.includes("CONTRATO TEMPORARIO")) return "CONTRATO TEMPORARIO";
      if (v.includes("COMISSIONADO")) return "COMISSIONADO";
      return v;
    }

    // Prepare inserts
    const servidores = Array.from(servidoresMap.values()).map((s) => ({
      nome: s.nome,
      matricula: "",
      cargo: s.cargo,
      local_trabalho: "SECRETARIA MUNICIPAL DE SAUDE",
      setor: "",
      funcao_critica: false,
      cobertura_prevista: "PARCIAL",
      vinculo: mapVinculo(s.vinculo),
      status_presenca: "presente",
      escala_total_horas: s.carga_horaria > 0 ? Math.round(s.carga_horaria / 5) : null,
      salario: s.salario,
    }));

    // Clear existing before import
    await supabase.from("servidores").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert in batches of 50
    let inserted = 0;
    let errors: string[] = [];
    const batchSize = 50;

    for (let i = 0; i < servidores.length; i += batchSize) {
      const batch = servidores.slice(i, i + batchSize);
      const { error } = await supabase.from("servidores").insert(batch);
      if (error) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_unique: servidores.length,
        inserted,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
