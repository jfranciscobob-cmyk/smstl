export interface EscalaLike {
  servidor_id: string;
  dia_semana: number;
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
}

export interface ServidorEscalaLike {
  id: string;
  tipo_escala?: string | null;
  escala_inicio1?: string | null;
  escala_fim1?: string | null;
  escala_inicio2?: string | null;
  escala_fim2?: string | null;
  escala_total_horas?: number | null;
}

const DAY_LABEL: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

function normalizeTipoEscala(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasTimePair(start: string | null | undefined, end: string | null | undefined): boolean {
  return parseTimeToMinutes(start) !== null && parseTimeToMinutes(end) !== null;
}

export function isPlantaoEscala(tipoEscala: string | null | undefined): boolean {
  return normalizeTipoEscala(tipoEscala).includes("plantao");
}

export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;

  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

export function isWithinShiftWindow(
  nowMinutes: number,
  entrada: string | null | undefined,
  saida: string | null | undefined,
): boolean {
  const start = parseTimeToMinutes(entrada);
  const end = parseTimeToMinutes(saida);
  if (start === null || end === null) return false;

  // overnight shifts (e.g. 22:00 -> 06:00)
  if (end < start) {
    return nowMinutes >= start || nowMinutes <= end;
  }

  return nowMinutes >= start && nowMinutes <= end;
}

export function calculateShiftHours(
  entrada: string | null | undefined,
  saida: string | null | undefined,
): number {
  const start = parseTimeToMinutes(entrada);
  const end = parseTimeToMinutes(saida);
  if (start === null || end === null) return 0;

  const minutes = end >= start ? end - start : 24 * 60 - start + end;
  return Math.round((minutes / 60) * 100) / 100;
}

export function calculateDailyHoursFromTimes(params: {
  entrada1: string | null | undefined;
  saida1: string | null | undefined;
  entrada2: string | null | undefined;
  saida2: string | null | undefined;
}): number {
  return Math.round(
    (calculateShiftHours(params.entrada1, params.saida1) +
      calculateShiftHours(params.entrada2, params.saida2)) *
      100,
  ) / 100;
}

export function getCurrentDayAndMinutes(
  timezone = "America/Campo_Grande",
  now: Date = new Date(),
): { dayOfWeek: number; nowMinutes: number } {
  const weekdayLong = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(now);

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const dayOfWeek = dayMap[weekdayLong] ?? now.getDay();

  const localHour = Number.parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now),
    10,
  );

  const localMinute = Number.parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      minute: "numeric",
    }).format(now),
    10,
  );

  return {
    dayOfWeek,
    nowMinutes: localHour * 60 + localMinute,
  };
}

export function hasLegacyEscalaConfigured(servidor: ServidorEscalaLike): boolean {
  return (
    hasTimePair(servidor.escala_inicio1, servidor.escala_fim1) ||
    hasTimePair(servidor.escala_inicio2, servidor.escala_fim2)
  );
}

export function hasWeeklyEscalaConfigured(escalas: EscalaLike[], servidorId: string): boolean {
  return escalas.some(
    (escala) =>
      escala.servidor_id === servidorId &&
      (hasTimePair(escala.entrada1, escala.saida1) || hasTimePair(escala.entrada2, escala.saida2)),
  );
}

export function hasAnyEscalaConfigured(
  servidor: ServidorEscalaLike,
  escalas: EscalaLike[],
): boolean {
  return hasWeeklyEscalaConfigured(escalas, servidor.id) || hasLegacyEscalaConfigured(servidor);
}

function getServidorEscalas(escalas: EscalaLike[], servidorId: string): EscalaLike[] {
  return escalas.filter((e) => e.servidor_id === servidorId);
}

export function getTodayEscala(
  escalas: EscalaLike[],
  servidorId: string,
  dayOfWeek: number,
): EscalaLike | null {
  return (
    getServidorEscalas(escalas, servidorId).find((e) => e.dia_semana === dayOfWeek) ?? null
  );
}

export function isServidorOnShiftNow(params: {
  servidor: ServidorEscalaLike;
  escalas: EscalaLike[];
  dayOfWeek: number;
  nowMinutes: number;
}): boolean {
  const { servidor, escalas, dayOfWeek, nowMinutes } = params;
  const todayEscala = getTodayEscala(escalas, servidor.id, dayOfWeek);

  if (todayEscala) {
    return (
      isWithinShiftWindow(nowMinutes, todayEscala.entrada1, todayEscala.saida1) ||
      isWithinShiftWindow(nowMinutes, todayEscala.entrada2, todayEscala.saida2)
    );
  }

  const hasAnyWeeklyRows = getServidorEscalas(escalas, servidor.id).length > 0;
  if (hasAnyWeeklyRows) {
    return false;
  }

  if (!hasLegacyEscalaConfigured(servidor)) {
    return false;
  }

  if (!isPlantaoEscala(servidor.tipo_escala) && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }

  return (
    isWithinShiftWindow(nowMinutes, servidor.escala_inicio1, servidor.escala_fim1) ||
    isWithinShiftWindow(nowMinutes, servidor.escala_inicio2, servidor.escala_fim2)
  );
}

export function getTodayShiftLabel(params: {
  servidor: ServidorEscalaLike;
  escalas: EscalaLike[];
  dayOfWeek: number;
}): string {
  const { servidor, escalas, dayOfWeek } = params;
  const todayEscala = getTodayEscala(escalas, servidor.id, dayOfWeek);

  if (todayEscala) {
    const t1 =
      hasTimePair(todayEscala.entrada1, todayEscala.saida1)
        ? `${todayEscala.entrada1}-${todayEscala.saida1}`
        : "";
    const t2 =
      hasTimePair(todayEscala.entrada2, todayEscala.saida2)
        ? `${todayEscala.entrada2}-${todayEscala.saida2}`
        : "";

    return [t1, t2].filter(Boolean).join(" / ") || "Folga";
  }

  const hasAnyWeeklyRows = getServidorEscalas(escalas, servidor.id).length > 0;
  if (hasAnyWeeklyRows) {
    return "Folga";
  }

  const t1 = hasTimePair(servidor.escala_inicio1, servidor.escala_fim1)
    ? `${servidor.escala_inicio1}-${servidor.escala_fim1}`
    : "";
  const t2 = hasTimePair(servidor.escala_inicio2, servidor.escala_fim2)
    ? `${servidor.escala_inicio2}-${servidor.escala_fim2}`
    : "";

  return [t1, t2].filter(Boolean).join(" / ") || "Sem escala";
}

export function getServidorWorkingDaysLabel(params: {
  servidor: ServidorEscalaLike;
  escalas: EscalaLike[];
}): string {
  const { servidor, escalas } = params;
  const days = Array.from(
    new Set(
      getServidorEscalas(escalas, servidor.id)
        .filter(
          (e) =>
            hasTimePair(e.entrada1, e.saida1) || hasTimePair(e.entrada2, e.saida2),
        )
        .map((e) => e.dia_semana),
    ),
  ).sort((a, b) => a - b);

  if (days.length === 0) {
    if (hasLegacyEscalaConfigured(servidor)) {
      return isPlantaoEscala(servidor.tipo_escala) ? "Plantão" : "Seg-Sex";
    }
    return "—";
  }

  const hasWeekdays = [1, 2, 3, 4, 5].every((d) => days.includes(d));
  if (hasWeekdays && days.length === 5) {
    return "Seg-Sex";
  }

  if (days.length === 2 && days.includes(0) && days.includes(6)) {
    return "Sáb-Dom";
  }

  return days.map((d) => DAY_LABEL[d] ?? String(d)).join(", ");
}

export function getServidorDailyHours(params: {
  servidor: ServidorEscalaLike;
  escalas: EscalaLike[];
  dayOfWeek: number;
}): number {
  const { servidor, escalas, dayOfWeek } = params;
  const todayEscala = getTodayEscala(escalas, servidor.id, dayOfWeek);

  if (todayEscala) {
    return calculateDailyHoursFromTimes({
      entrada1: todayEscala.entrada1,
      saida1: todayEscala.saida1,
      entrada2: todayEscala.entrada2,
      saida2: todayEscala.saida2,
    });
  }

  const hasAnyWeeklyRows = getServidorEscalas(escalas, servidor.id).length > 0;
  if (hasAnyWeeklyRows) {
    return 0;
  }

  const fromLegacyTimes = calculateDailyHoursFromTimes({
    entrada1: servidor.escala_inicio1,
    saida1: servidor.escala_fim1,
    entrada2: servidor.escala_inicio2,
    saida2: servidor.escala_fim2,
  });

  if (fromLegacyTimes > 0) return fromLegacyTimes;

  return servidor.escala_total_horas ?? 0;
}
