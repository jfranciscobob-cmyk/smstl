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
    const dataLines = lines.slice(1); // Skip header

    // Parse CSV and deduplicate by name
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
      const salarioRaw = (parts[8] || "").trim().replace(/[^\d.,]/g, "").replace(",", ".");
      const salario = parseFloat(salarioRaw) || 0;

      if (!nome) continue;

      if (!servidoresMap.has(nome)) {
        servidoresMap.set(nome, { nome, cargo, vinculo, carga_horaria: cargaHoraria, data_admissao: dataAdmissao, salario });
      }
    }

    function mapVinculo(v: string): string {
      if (v.includes("ESTATUTARIO EFETIVO")) return "CONCURSADO (EFETIVO)";
      if (v.includes("CONTRATO TEMPORARIO")) return "CONTRATO TEMPORARIO";
      if (v.includes("COMISSIONADO")) return "COMISSIONADO";
      return v;
    }

    // ═══ FETCH ALL EXISTING SERVIDORES ═══
    const PAGE = 1000;
    let offset = 0;
    let existingAll: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("servidores")
        .select("id, nome")
        .order("nome")
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      existingAll = existingAll.concat(data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // Build a map of existing servidores by normalized name
    const normalizeName = (n: string) => n.trim().toUpperCase();
    const existingByName = new Map<string, string>(); // name -> id
    for (const e of existingAll) {
      existingByName.set(normalizeName(e.nome), e.id);
    }

    const csvNames = new Set<string>();
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    for (const s of servidoresMap.values()) {
      const key = normalizeName(s.nome);
      csvNames.add(key);

      const updateFields: any = {
        cargo: s.cargo,
        vinculo: mapVinculo(s.vinculo),
        salario: s.salario,
      };
      if (s.carga_horaria > 0) {
        updateFields.escala_total_horas = Math.round(s.carga_horaria / 5);
      }

      const existingId = existingByName.get(key);
      if (existingId) {
        // UPDATE existing — only update CSV-sourced fields, NEVER touch:
        // diretoria_id, unidade_id, coordenacao_id, setor_id, funcao_id,
        // is_diretor, is_coordenador, is_secretario, is_diretor_geral,
        // status_presenca, observacao, funcao_critica, cobertura_prevista, etc.
        toUpdate.push({ id: existingId, data: updateFields });
      } else {
        // INSERT new
        toInsert.push({
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
        });
      }
    }

    // ═══ DETECT REMOVED SERVIDORES (in DB but not in CSV) ═══
    const removedNames: string[] = [];
    const removedIds: string[] = [];
    for (const [name, id] of existingByName.entries()) {
      if (!csvNames.has(name)) {
        removedNames.push(name);
        removedIds.push(id);
      }
    }

    // Mark removed servidores with an observation instead of deleting
    // We set status to "ausente" and add a note, but NEVER delete
    const markedDate = new Date().toISOString().slice(0, 10);
    for (const id of removedIds) {
      await supabase.from("servidores").update({
        status_presenca: "ausente",
        observacao: `[IMPORTAÇÃO ${markedDate}] Servidor não consta na planilha atualizada.`,
      }).eq("id", id);
    }

    // ═══ UPDATE EXISTING ═══
    let updated = 0;
    let errors: string[] = [];
    for (const item of toUpdate) {
      const { error } = await supabase.from("servidores").update(item.data).eq("id", item.id);
      if (error) {
        errors.push(`Update ${item.id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    // ═══ INSERT NEW ═══
    let inserted = 0;
    const batchSize = 50;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("servidores").insert(batch);
      if (error) {
        errors.push(`Insert batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_csv: servidoresMap.size,
        inserted,
        updated,
        removed: removedNames.length,
        removed_names: removedNames.slice(0, 50), // Show up to 50 removed names
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
