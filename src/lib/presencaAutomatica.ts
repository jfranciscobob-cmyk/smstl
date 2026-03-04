/**
 * Computes effective presence status for servidores with fixed schedules.
 *
 * Rules:
 * - If status is 'ferias', 'afastado', or 'atestado' → keep as-is (priority statuses)
 * - If tipo_escala !== 'fixa' → keep manual status_presenca (plantão etc.)
 * - If tipo_escala === 'fixa':
 *   - No escala_semanal entry for today → 'folga' (rest day)
 *   - Has entry but no times → 'ausente'
 *   - Current time within scheduled hours → 'presente'
 *   - Current time outside scheduled hours → 'ausente'
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
}

// Statuses that take absolute priority (set by admin/gestor)
const PRIORITY_STATUSES = ["ferias", "afastado", "atestado"];

/**
 * Parse "HH:MM" to minutes since midnight
 */
function parseTime(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Check if current time (in minutes) falls within a shift period
 */
function isWithinShift(
  nowMinutes: number,
  entrada: string | null,
  saida: string | null,
): boolean {
  const start = parseTime(entrada);
  const end = parseTime(saida);
  if (start === null || end === null) return false;

  // Handle overnight shifts (e.g., 22:00 - 06:00)
  if (end < start) {
    return nowMinutes >= start || nowMinutes <= end;
  }
  return nowMinutes >= start && nowMinutes <= end;
}

/**
 * Given a servidor and their weekly escalas, compute the effective status.
 */
export function getEffectiveStatus(
  servidor: ServidorForPresenca,
  escalas: EscalaSemanalRow[],
  now: Date = new Date(),
): string {
  // Use Três Lagoas/MS timezone (America/Sao_Paulo) for all calculations
  const tzOptions = { timeZone: "America/Sao_Paulo" } as const;
  // Priority statuses always win
  if (PRIORITY_STATUSES.includes(servidor.status_presenca)) {
    return servidor.status_presenca;
  }

  // Non-fixed schedules keep manual status
  if (servidor.tipo_escala !== "fixa") {
    return servidor.status_presenca;
  }

  // Fixed schedule: check if servidor has ANY escalas configured at all
  const servidorEscalas = escalas.filter((e) => e.servidor_id === servidor.id);

  // If no escalas configured at all → keep manual status (schedule not set up yet)
  if (servidorEscalas.length === 0) {
    return servidor.status_presenca;
  }

  // Find today's escala using local TZ (Três Lagoas/MS)
  const weekdayLong = new Intl.DateTimeFormat("en-US", { ...tzOptions, weekday: "long" }).format(now);
  const dayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const localDayOfWeek = dayMap[weekdayLong] ?? now.getDay();

  const todayEscalas = servidorEscalas.filter((e) => e.dia_semana === localDayOfWeek);

  // Has escalas configured but none for today → day off
  if (todayEscalas.length === 0) {
    return "folga";
  }

  const escala = todayEscalas[0];

  // Has entry but no times configured → treat as no schedule
  if (!escala.entrada1 && !escala.entrada2) {
    return "folga";
  }

  // Get current time in local TZ
  const localHour = parseInt(new Intl.DateTimeFormat("en-US", { ...tzOptions, hour: "numeric", hour12: false }).format(now));
  const localMinute = parseInt(new Intl.DateTimeFormat("en-US", { ...tzOptions, minute: "numeric" }).format(now));
  const nowMinutes = localHour * 60 + localMinute;

  // Check if within any shift period
  const inShift1 = isWithinShift(nowMinutes, escala.entrada1, escala.saida1);
  const inShift2 = isWithinShift(nowMinutes, escala.entrada2, escala.saida2);

  return inShift1 || inShift2 ? "presente" : "ausente";
}

/**
 * Apply effective status to an array of servidores.
 * Returns a new array with status_presenca overridden for fixed-schedule servidores.
 */
export function applyAutoPresenca<T extends ServidorForPresenca>(
  servidores: T[],
  escalas: EscalaSemanalRow[],
  now: Date = new Date(),
): T[] {
  return servidores.map((s) => ({
    ...s,
    status_presenca: getEffectiveStatus(s, escalas, now),
  }));
}
