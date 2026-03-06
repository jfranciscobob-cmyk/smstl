import { differenceInCalendarDays, parseISO } from "date-fns";

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  try {
    const parsed = parseISO(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  } catch {
    // ignore parse errors
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function calcularDiasPeriodo(inicio: string | null | undefined, fim: string | null | undefined): number {
  const dataInicio = parseDateOnly(inicio);
  const dataFim = parseDateOnly(fim);
  if (!dataInicio || !dataFim || dataFim < dataInicio) return 0;
  return differenceInCalendarDays(dataFim, dataInicio) + 1;
}

export function calcularTotalDiasFerias(params: {
  periodo1Inicio?: string | null;
  periodo1Fim?: string | null;
  periodo2Inicio?: string | null;
  periodo2Fim?: string | null;
}): number | null {
  const total =
    calcularDiasPeriodo(params.periodo1Inicio, params.periodo1Fim) +
    calcularDiasPeriodo(params.periodo2Inicio, params.periodo2Fim);

  return total > 0 ? total : null;
}
