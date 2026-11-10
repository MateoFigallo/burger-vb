const DAY_MS = 24 * 60 * 60 * 1000;

const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

/** Días entre una fecha ISO y ahora. */
export function daysSince(isoDate: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY_MS);
}

/** Mes (0 a 11) de una fecha de nacimiento "AAAA-MM-DD". `null` si está vacía. */
export function birthdayMonth(birthday: string): number | null {
  const month = Number(birthday.slice(5, 7));
  return month >= 1 && month <= 12 ? month - 1 : null;
}

export function isBirthdayThisMonth(birthday: string, now: Date = new Date()): boolean {
  return birthdayMonth(birthday) === now.getMonth();
}

/** "15 de noviembre" a partir de "AAAA-MM-DD". */
export function formatBirthday(birthday: string): string {
  if (birthdayMonth(birthday) === null) return "";
  return dayMonthFormatter.format(new Date(`${birthday}T00:00:00Z`));
}

export function formatShortDate(isoDate: string): string {
  return shortDateFormatter.format(new Date(isoDate));
}

/** "hoy", "hace 3 días", "hace 2 meses". */
export function formatRelativeDays(isoDate: string, now: Date = new Date()): string {
  const days = daysSince(isoDate, now);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
}

export function isSameMonth(isoDate: string, now: Date = new Date()): boolean {
  const date = new Date(isoDate);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
