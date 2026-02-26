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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { csvData } = await req.json();

    if (!csvData || typeof csvData !== "string") {
      throw new Error("csvData is required");
    }

    const lines = csvData.split("\n").filter((l: string) => l.trim().length > 0);
    const dataLines = lines.slice(1);

    // Parse CSV and deduplicate by name, tracking dual vínculos
    const servidoresMap = new Map<string, {
      nome: string;
      cargo: string;
      vinculo: string;
      vinculo2: string | null;
      duplo_vinculo: boolean;
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
      const salarioRaw = (parts[8] || "").trim().replace(/[^\d.,]/g, "");
      const salario = parseFloat(salarioRaw.replace(/\./g, "").replace(",", ".")) || 0;

      if (!nome) continue;

      if (servidoresMap.has(nome)) {
        const existing = servidoresMap.get(nome)!;
        existing.salario += salario;
        if (cargaHoraria > existing.carga_horaria) existing.carga_horaria = cargaHoraria;
        // Detect dual vínculo
        if (vinculo && vinculo !== existing.vinculo) {
          existing.vinculo2 = vinculo;
          existing.duplo_vinculo = true;
        } else if (!existing.duplo_vinculo) {
          // Same vínculo appearing twice = still duplo vínculo (2 matrículas)
          existing.duplo_vinculo = true;
          existing.vinculo2 = vinculo;
        }
      } else {
        servidoresMap.set(nome, { nome, cargo, vinculo, vinculo2: null, duplo_vinculo: false, carga_horaria: cargaHoraria, data_admissao: dataAdmissao, salario });
      }
    }

    function mapVinculo(v: string): string {
      if (v.includes("ESTATUTARIO EFETIVO")) return "CONCURSADO (EFETIVO)";
      if (v.includes("CONTRATO TEMPORARIO")) return "CONTRATO TEMPORARIO";
      if (v.includes("COMISSIONADO")) return "COMISSIONADO";
      return v;
    }

    // Fetch all existing servidores
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

    const normalizeName = (n: string) => n.trim().toUpperCase();
    const existingByName = new Map<string, string>();
    for (const e of existingAll) {
      existingByName.set(normalizeName(e.nome), e.id);
    }

    const csvNames = new Set<string>();
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    for (const s of servidoresMap.values()) {
      const key = normalizeName(s.nome);
      csvNames.add(key);

      let dataAdmissaoISO: string | null = null;
      if (s.data_admissao) {
        const parts = s.data_admissao.split("/");
        if (parts.length === 3) {
          dataAdmissaoISO = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      const updateFields: any = {
        cargo: s.cargo,
        vinculo: mapVinculo(s.vinculo),
        vinculo2: s.vinculo2 ? mapVinculo(s.vinculo2) : null,
        duplo_vinculo: s.duplo_vinculo,
        salario: s.salario,
      };
      if (dataAdmissaoISO) updateFields.data_admissao = dataAdmissaoISO;
      if (s.carga_horaria > 0) {
        updateFields.escala_total_horas = Math.round(s.carga_horaria / 5);
      }

      const existingId = existingByName.get(key);
      if (existingId) {
        toUpdate.push({ id: existingId, data: updateFields });
      } else {
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
          data_admissao: dataAdmissaoISO,
        });
      }
    }

    // Detect removed servidores
    const removedNames: string[] = [];
    const removedIds: string[] = [];
    for (const [name, id] of existingByName.entries()) {
      if (!csvNames.has(name)) {
        removedNames.push(name);
        removedIds.push(id);
      }
    }

    const errors: string[] = [];
    const markedDate = new Date().toISOString().slice(0, 10);

    // Mark removed in batch (chunks of 50 ids)
    for (let i = 0; i < removedIds.length; i += 50) {
      const batch = removedIds.slice(i, i + 50);
      const { error } = await supabase.from("servidores").update({
        status_presenca: "ausente",
        observacao: `[IMPORTAÇÃO ${markedDate}] Servidor não consta na planilha atualizada.`,
      }).in("id", batch);
      if (error) errors.push(`Mark removed batch: ${error.message}`);
    }

    // Update existing in parallel batches of 10
    let updated = 0;
    const updateBatchSize = 10;
    for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
      const batch = toUpdate.slice(i, i + updateBatchSize);
      const results = await Promise.all(
        batch.map(item =>
          supabase.from("servidores").update(item.data).eq("id", item.id)
        )
      );
      for (const r of results) {
        if (r.error) errors.push(`Update: ${r.error.message}`);
        else updated++;
      }
    }

    // Insert new in batches
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("servidores").insert(batch);
      if (error) errors.push(`Insert batch: ${error.message}`);
      else inserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_csv: servidoresMap.size,
        inserted,
        updated,
        removed: removedNames.length,
        removed_names: removedNames.slice(0, 50),
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
