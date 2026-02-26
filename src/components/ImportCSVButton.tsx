import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle, AlertTriangle } from "lucide-react";

interface ImportResult {
  success: boolean;
  total_csv?: number;
  inserted?: number;
  updated?: number;
  removed?: number;
  removed_names?: string[];
  errors?: string[];
  error?: string;
}

export function ImportCSVButton({ onComplete }: { onComplete: () => void }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const csvData = await file.text();
      const { data, error } = await supabase.functions.invoke("import-servidores", {
        body: { csvData },
      });

      if (error) {
        setResult({ success: false, error: error.message });
      } else {
        setResult(data as ImportResult);
        if ((data?.inserted > 0 || data?.updated > 0)) {
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
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      <button
        onClick={handleFileSelect}
        disabled={importing}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {importing ? "Importando..." : "Importar CSV de Servidores"}
      </button>

      {result && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          result.success
            ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {result.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold">Importação concluída!</span>
              </div>
              <div className="text-xs space-y-0.5 ml-6">
                <p>📄 {result.total_csv} servidores no CSV</p>
                {(result.inserted ?? 0) > 0 && <p>✅ {result.inserted} novos inseridos</p>}
                {(result.updated ?? 0) > 0 && <p>🔄 {result.updated} atualizados (dados preservados)</p>}
                {(result.removed ?? 0) > 0 && (
                  <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2">
                    <div className="flex items-center gap-1.5 text-warning font-semibold mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {result.removed} servidor(es) não constam no novo CSV
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Foram marcados como "ausente" — nenhum dado foi perdido.
                    </p>
                    {result.removed_names && result.removed_names.length > 0 && (
                      <ul className="text-[10px] text-muted-foreground max-h-32 overflow-y-auto space-y-0.5">
                        {result.removed_names.map((name, i) => (
                          <li key={i}>• {name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="text-xs text-destructive ml-6">
                  {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>Erro: {result.error}</p>
              {result.errors?.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
