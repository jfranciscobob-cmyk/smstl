import { getCurrentDayAndMinutes, hasLegacyEscalaConfigured, isWithinShiftWindow } from "@/lib/escalaUtils";

/**
 * Computes effective presence status for servidores with fixed schedules.
 *
 * Rules (priority order):
 * - Active férias period on servidor record -> 'ferias'
 * - Active afastamento -> 'afastado'
 * - Active atestado -> 'atestado'
 * - Falta abonada today -> 'ausente'
 * - Manual priority statuses ('ferias', 'afastado', 'atestado') remain as-is
 * - If tipo_escala !== 'fixa' -> keep manual status_presenca
 * - If tipo_escala === 'fixa':
 *   - No escala_semanal entry for today -> 'folga'
 *   - Has entry but no times -> 'folga'
 *   - Current time within scheduled hours -> 'presente'
 *   - Current time outside scheduled hours -> 'ausente'
 */

export interface EscalaSemanalRow {
  servidor_id: string;
  dia_semana: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
}

export interface ServidorForPresenca {
  id: string;
  tipo_escala: string;
  status_presenca: string;
  escala_inicio1?: string | null;
  escala_fim1?: string | null;
  escala_inicio2?: string | null;
  escala_fim2?: string | null;
  ferias_periodo1_inicio?: string | null;
  ferias_periodo1_fim?: string | null;
  ferias_periodo2_inicio?: string | null;
  ferias_periodo2_fim?: string | null;
}

export interface AtestadoForPresenca {
  servidor_id: string;
  data_inicio: string;
  data_fim: string;
}

export interface AfastamentoForPresenca {
  servidor_id: string;
  data_inicio: string;
  data_fim: string | null;
}

export interface FaltaAbonadaForPresenca {
  servidor_id: string;
  data: string;
}

export interface PresencaContext {
  timezone?: string;
  atestados?: AtestadoForPresenca[];
  afastamentos?: AfastamentoForPresenca[];
  faltasAbonadas?: FaltaAbonadaForPresenca[];
}

// Statuses that take absolute priority when set manually
const PRIORITY_STATUSES = ["ferias", "afastado", "atestado"];
const DEFAULT_TIMEZONE = "America/Campo_Grande";

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const matched = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matched?.[1]) return matched[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function getDateKeyInTimezone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function isDateWithinRange(todayKey: string, startRaw: string | null | undefined, endRaw: string | null | undefined, allowOpenEnd = false): boolean {
  const start = normalizeDate(startRaw);
  if (!start) return false;

  const end = normalizeDate(endRaw);
  if (!end && !allowOpenEnd) {
    return todayKey === start;
  }

  if (allowOpenEnd && !end) {
    return todayKey >= start;
  }

  const finalEnd = end ?? start;
  return todayKey >= start && todayKey <= finalEnd;
}


/**
 * Given a servidor and their weekly escalas, compute the effective status.
 */
export function getEffectiveStatus(
  servidor: ServidorForPresenca,
  escalas: EscalaSemanalRow[],
  now: Date = new Date(),
  context: PresencaContext = {},
): string {
  const timezone = context.timezone ?? DEFAULT_TIMEZONE;
  const todayKey = getDateKeyInTimezone(now, timezone);
  const { dayOfWeek: localDayOfWeek, nowMinutes } = getCurrentDayAndMinutes(timezone, now);

  // 1) Active férias period on servidor
  const feriasAtivas =
    isDateWithinRange(todayKey, servidor.ferias_periodo1_inicio, servidor.ferias_periodo1_fim) ||
    isDateWithinRange(todayKey, servidor.ferias_periodo2_inicio, servidor.ferias_periodo2_fim);
  if (feriasAtivas) return "ferias";

  // 2) Active afastamento record
  const afastamentoAtivo = (context.afastamentos ?? []).some(
    (a) =>
      a.servidor_id === servidor.id &&
      isDateWithinRange(todayKey, a.data_inicio, a.data_fim, true),
  );
  if (afastamentoAtivo) return "afastado";

  // 3) Active atestado record
  const atestadoAtivo = (context.atestados ?? []).some(
    (a) =>
      a.servidor_id === servidor.id &&
      isDateWithinRange(todayKey, a.data_inicio, a.data_fim),
  );
  if (atestadoAtivo) return "atestado";

  // 4) Falta abonada for today
  const faltaHoje = (context.faltasAbonadas ?? []).some(
    (f) => f.servidor_id === servidor.id && normalizeDate(f.data) === todayKey,
  );
  if (faltaHoje) return "ausente";

  // 5) Manual priority statuses always win
  if (PRIORITY_STATUSES.includes(servidor.status_presenca)) {
    return servidor.status_presenca;
  }

  // Non-fixed schedules keep manual status
  if (servidor.tipo_escala !== "fixa") {
    return servidor.status_presenca;
  }

  // Fixed schedule: check if servidor has ANY escalas configured at all
  const servidorEscalas = escalas.filter((e) => e.servidor_id === servidor.id);

  // Legacy fallback for fixed schedule without escalas_semanais rows
  if (servidorEscalas.length === 0) {
    if (!hasLegacyEscalaConfigured(servidor)) {
      return servidor.status_presenca;
    }

    // Legacy fixed schedules default to weekdays only
    if (localDayOfWeek === 0 || localDayOfWeek === 6) {
      return "folga";
    }

    const inLegacyShift1 = isWithinShiftWindow(
      nowMinutes,
      servidor.escala_inicio1,
      servidor.escala_fim1,
    );
    const inLegacyShift2 = isWithinShiftWindow(
      nowMinutes,
      servidor.escala_inicio2,
      servidor.escala_fim2,
    );

    return inLegacyShift1 || inLegacyShift2 ? "presente" : "ausente";
  }

  const todayEscalas = servidorEscalas.filter((e) => e.dia_semana === localDayOfWeek);

  // Has escalas configured but none for today -> day off
  if (todayEscalas.length === 0) {
    return "folga";
  }

  const escala = todayEscalas[0];

  // Has entry but no times configured -> treat as day off
  if (!escala.entrada1 && !escala.entrada2) {
    return "folga";
  }

  // Check if within any shift period
  const inShift1 = isWithinShiftWindow(nowMinutes, escala.entrada1, escala.saida1);
  const inShift2 = isWithinShiftWindow(nowMinutes, escala.entrada2, escala.saida2);

  return inShift1 || inShift2 ? "presente" : "ausente";
}

/**
 * Apply effective status to an array of servidores.
 * Returns a new array with status_presenca overridden when rules match.
 */
export function applyAutoPresenca<T extends ServidorForPresenca>(
  servidores: T[],
  escalas: EscalaSemanalRow[],
  now: Date = new Date(),
  context: PresencaContext = {},
): T[] {
  return servidores.map((s) => ({
    ...s,
    status_presenca: getEffectiveStatus(s, escalas, now, context),
  }));
}
