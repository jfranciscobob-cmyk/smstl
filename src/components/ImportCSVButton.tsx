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

      // Call edge function
      const { data, error } = await supabase.functions.invoke("import-servidores", {
        body: { csvData },
      });

      if (error) {
        setResult({ success: false, error: error.message });
      } else {
        setResult(data as ImportResult);
        if (data?.inserted > 0) {
          onComplete();
        }
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
            ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
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
