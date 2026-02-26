import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle } from "lucide-react";

interface ImportResult {
  success: boolean;
  total_unique?: number;
  inserted?: number;
  errors?: string[];
  error?: string;
}

export function ImportCSVButton({ onComplete }: { onComplete: () => void }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      // Fetch the CSV from public folder
      const response = await fetch("/data/servidores.csv");
      const csvData = await response.text();

      // Parse CSV client-side
      const lines = csvData.split("\n").filter((l) => l.trim().length > 0);
      const dataLines = lines.slice(1); // skip header

      // Deduplicate by name
      const servidoresMap = new Map<string, {
        nome: string;
        cargo: string;
        vinculo: string;
        carga_horaria: number;
      }>();

      for (const line of dataLines) {
        const parts = line.split(";");
        if (parts.length < 7) continue;

        const nome = (parts[2] || "").trim();
        const vinculo = (parts[3] || "").trim();
        const cargo = (parts[5] || "").trim();
        const cargaHoraria = parseInt(parts[7] || "0", 10) || 0;

        if (!nome) continue;

        if (!servidoresMap.has(nome)) {
          servidoresMap.set(nome, { nome, cargo, vinculo, carga_horaria: cargaHoraria });
        }
      }

      // Map vinculo
      function mapVinculo(v: string): string {
        if (v.includes("ESTATUTARIO EFETIVO")) return "CONCURSADO (EFETIVO)";
        if (v.includes("CONTRATO TEMPORARIO")) return "CONTRATO TEMPORARIO";
        if (v.includes("COMISSIONADO")) return "COMISSIONADO";
        if (v.includes("C.L.T.")) return "CLT";
        if (v.includes("AGENTE POLITICO")) return "AGENTE POLITICO";
        return v;
      }

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
      }));

      // Insert in batches of 50
      let inserted = 0;
      const errors: string[] = [];
      const batchSize = 50;

      for (let i = 0; i < servidores.length; i += batchSize) {
        const batch = servidores.slice(i, i + batchSize);
        const { error } = await supabase.from("servidores").insert(batch as any);
        if (error) {
          errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      setResult({
        success: errors.length === 0,
        total_unique: servidores.length,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
      });

      if (inserted > 0) {
        onComplete();
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }

    setImporting(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleImport}
        disabled={importing}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {importing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {importing ? "Importando..." : "Importar Servidores do CSV"}
      </button>

      {result && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          result.success
            ? "border-status-present/30 bg-status-present/10 text-status-present"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {result.success ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{result.inserted} servidores importados de {result.total_unique} únicos encontrados!</span>
            </div>
          ) : (
            <div>
              <p>Erro: {result.error}</p>
              {result.errors?.map((e, i) => <p key={i}>{e}</p>)}
              {result.inserted && result.inserted > 0 && (
                <p className="mt-1">{result.inserted} servidores foram importados com sucesso.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
