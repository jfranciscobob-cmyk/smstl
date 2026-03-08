import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EscalaSemanalDB {
  id: string;
  servidor_id: string;
  dia_semana: number;
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
  total_horas: number | null;
  observacao: string | null;
}

// dia_semana follows JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
// Display order: Monday first, Sunday last
const DIAS_DISPLAY = [
  { label: "Seg", dbDay: 1 },
  { label: "Ter", dbDay: 2 },
  { label: "Qua", dbDay: 3 },
  { label: "Qui", dbDay: 4 },
  { label: "Sex", dbDay: 5 },
  { label: "Sáb", dbDay: 6 },
  { label: "Dom", dbDay: 0 },
];

interface Props {
  servidorId: string;
  servidorNome: string;
  defaultEscala?: { inicio1: string; fim1: string; inicio2: string; fim2: string; total: number | null };
  onTotalChange?: (totalSemanal: number) => void;
}

function calcHoursFromTimes(entrada1: string, saida1: string, entrada2: string, saida2: string): number {
  const toMin = (t: string): number | null => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  let total = 0;
  const e1 = toMin(entrada1), s1 = toMin(saida1);
  if (e1 !== null && s1 !== null && s1 > e1) total += (s1 - e1) / 60;
  const e2 = toMin(entrada2), s2 = toMin(saida2);
  if (e2 !== null && s2 !== null && s2 > e2) total += (s2 - e2) / 60;
  return Math.round(total * 100) / 100;
}

export function EscalaSemanalEditor({ servidorId, servidorNome, defaultEscala, onTotalChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [escalas, setEscalas] = useState<Record<number, { entrada1: string; saida1: string; entrada2: string; saida2: string; total: string; obs: string }>>({});

  useEffect(() => {
    const init: Record<number, any> = {};
    for (let i = 0; i < 7; i++) {
      init[i] = {
        entrada1: defaultEscala?.inicio1 || "",
        saida1: defaultEscala?.fim1 || "",
        entrada2: defaultEscala?.inicio2 || "",
        saida2: defaultEscala?.fim2 || "",
        total: defaultEscala?.total?.toString() || "",
        obs: "",
      };
    }

    (async () => {
      const { data } = await supabase
        .from("escalas_semanais")
        .select("*")
        .eq("servidor_id", servidorId)
        .order("dia_semana");

      if (data && data.length > 0) {
        for (const row of data as EscalaSemanalDB[]) {
          init[row.dia_semana] = {
            entrada1: row.entrada1 || "",
            saida1: row.saida1 || "",
            entrada2: row.entrada2 || "",
            saida2: row.saida2 || "",
            total: row.total_horas?.toString() || "",
            obs: row.observacao || "",
          };
        }
      }
      setEscalas(init);
      setLoading(false);
    })();
  }, [servidorId]);

  // Compute weekly total
  const weeklyTotal = Object.values(escalas).reduce((sum, day) => sum + (parseFloat(day.total) || 0), 0);

  // Notify parent of total changes
  useEffect(() => {
    if (!loading && onTotalChange) {
      onTotalChange(weeklyTotal);
    }
  }, [weeklyTotal, loading]);

  const setDay = useCallback((dia: number, key: string, value: string) => {
    setEscalas(prev => {
      const updated = { ...prev, [dia]: { ...prev[dia], [key]: value } };
      // Auto-calc hours when time fields change
      if (["entrada1", "saida1", "entrada2", "saida2"].includes(key)) {
        const day = updated[dia];
        const calc = calcHoursFromTimes(day.entrada1, day.saida1, day.entrada2, day.saida2);
        if (calc > 0) {
          updated[dia] = { ...updated[dia], total: calc.toString() };
        }
      }
      return updated;
    });
  }, []);

  const copyToAll = (fromDbDay: number) => {
    const source = escalas[fromDbDay];
    if (!source) return;
    const updated = { ...escalas };
    for (const d of DIAS_DISPLAY) {
      updated[d.dbDay] = { ...source };
    }
    setEscalas(updated);
    const label = DIAS_DISPLAY.find(d => d.dbDay === fromDbDay)?.label ?? "";
    toast({ title: `Escala de ${label} copiada para todos os dias` });
  };

  const handleSave = async () => {
    setSaving(true);
    let errors = 0;
    for (const d of DIAS_DISPLAY) {
      const esc = escalas[d.dbDay];
      if (!esc) continue;
      const { error } = await supabase
        .from("escalas_semanais")
        .upsert({
          servidor_id: servidorId,
          dia_semana: d.dbDay,
          entrada1: esc.entrada1 || null,
          saida1: esc.saida1 || null,
          entrada2: esc.entrada2 || null,
          saida2: esc.saida2 || null,
          total_horas: esc.total ? parseFloat(esc.total) : null,
          observacao: esc.obs || null,
        }, { onConflict: "servidor_id,dia_semana" });
      if (error) errors++;
    }

    // Also update servidores.escala_total_horas with the weekly total
    const totalSemanal = Object.values(escalas).reduce((s, d) => s + (parseFloat(d.total) || 0), 0);
    await supabase.from("servidores").update({ escala_total_horas: Math.round(totalSemanal) }).eq("id", servidorId);

    setSaving(false);
    if (errors > 0) {
      toast({ title: "Alguns dias falharam ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Escala semanal salva!" });
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>;

  const inputClass = "w-[70px] h-6 rounded border border-input bg-background px-1 text-[10px] text-foreground text-center focus:ring-1 focus:ring-ring focus:outline-none";

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Escala Semanal — {servidorNome}
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            Total: {weeklyTotal.toFixed(1)}h/sem
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 h-6 px-2 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Salvar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-1 text-left font-semibold text-muted-foreground w-12">Dia</th>
              <th className="pb-1 font-semibold text-muted-foreground">Entrada 1</th>
              <th className="pb-1 font-semibold text-muted-foreground">Saída 1</th>
              <th className="pb-1 font-semibold text-muted-foreground">Entrada 2</th>
              <th className="pb-1 font-semibold text-muted-foreground">Saída 2</th>
              <th className="pb-1 font-semibold text-muted-foreground">Horas</th>
              <th className="pb-1 font-semibold text-muted-foreground">Obs</th>
              <th className="pb-1 w-8"></th>
            </tr>
          </thead>
           <tbody>
            {DIAS_DISPLAY.map(({ label, dbDay }) => {
              const esc = escalas[dbDay];
              if (!esc) return null;
              const isWeekend = dbDay === 0 || dbDay === 6;
              const dayHours = parseFloat(esc.total) || 0;
              return (
                <tr key={dbDay} className={cn("border-b border-border/20", isWeekend && "bg-muted/30")}>
                  <td className="py-1 font-bold text-foreground">{label}</td>
                  <td className="py-1"><input type="time" className={inputClass} value={esc.entrada1} onChange={e => setDay(dbDay, "entrada1", e.target.value)} /></td>
                  <td className="py-1"><input type="time" className={inputClass} value={esc.saida1} onChange={e => setDay(dbDay, "saida1", e.target.value)} /></td>
                  <td className="py-1"><input type="time" className={inputClass} value={esc.entrada2} onChange={e => setDay(dbDay, "entrada2", e.target.value)} /></td>
                  <td className="py-1"><input type="time" className={inputClass} value={esc.saida2} onChange={e => setDay(dbDay, "saida2", e.target.value)} /></td>
                  <td className="py-1">
                    <span className={cn("inline-block w-10 text-center font-bold", dayHours > 0 ? "text-primary" : "text-muted-foreground")}>
                      {dayHours > 0 ? `${dayHours}h` : "—"}
                    </span>
                  </td>
                  <td className="py-1"><input className={cn(inputClass, "w-20 text-left")} value={esc.obs} onChange={e => setDay(dbDay, "obs", e.target.value)} placeholder="Obs" /></td>
                  <td className="py-1">
                    <button onClick={() => copyToAll(dbDay)} title={`Copiar ${label} para todos`} className="text-[9px] text-primary hover:text-primary/80 font-medium">
                      ⟹
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td colSpan={5} className="py-1.5 text-right font-bold text-foreground text-[11px]">Total Semanal:</td>
              <td className="py-1.5 text-center font-bold text-primary text-[11px]">{weeklyTotal.toFixed(1)}h</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
