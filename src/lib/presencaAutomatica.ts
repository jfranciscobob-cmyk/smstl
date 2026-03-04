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
  // Priority statuses always win
  if (PRIORITY_STATUSES.includes(servidor.status_presenca)) {
    return servidor.status_presenca;
  }

  // Non-fixed schedules keep manual status
  if (servidor.tipo_escala !== "fixa") {
    return servidor.status_presenca;
  }

  // Fixed schedule: find today's escala
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const todayEscalas = escalas.filter(
    (e) => e.servidor_id === servidor.id && e.dia_semana === dayOfWeek,
  );

  // No escala entry for today → day off
  if (todayEscalas.length === 0) {
    return "folga";
  }

  const escala = todayEscalas[0];

  // Has entry but no times configured → treat as no schedule
  if (!escala.entrada1 && !escala.entrada2) {
    return "folga";
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

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
