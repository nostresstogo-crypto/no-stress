function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDate(date: Date | string): Date | null {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

const WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatDateFr(
  date: Date | string,
  opts: { withWeekday?: boolean; short?: boolean } = {}
): string {
  const d = toDate(date);
  if (!d) return "";
  const dmy = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (opts.withWeekday) return `${WEEKDAYS_FR[d.getDay()]} ${dmy}`;
  return dmy;
}

export function formatDateEn(
  date: Date | string,
  opts: { withWeekday?: boolean; short?: boolean } = {}
): string {
  const d = toDate(date);
  if (!d) return "";
  const dmy = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (opts.withWeekday) return `${WEEKDAYS_EN[d.getDay()]} ${dmy}`;
  return dmy;
}

export function formatDateLocalized(
  date: Date | string,
  lang: "fr" | "en",
  opts: { withWeekday?: boolean; short?: boolean } = {}
): string {
  return lang === "fr" ? formatDateFr(date, opts) : formatDateEn(date, opts);
}

export function formatTime(date: Date | string): string {
  const d = toDate(date);
  if (!d) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateTimeLocalized(
  date: Date | string,
  lang: "fr" | "en"
): string {
  const d = toDate(date);
  if (!d) return "";
  const datePart = formatDateLocalized(d, lang);
  const timePart = formatTime(d);
  return lang === "fr" ? `${datePart} à ${timePart}` : `${datePart} at ${timePart}`;
}
