function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDate(date: Date | string): Date | null {
  if (typeof date === "string") {
    // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by iOS,
    // which shifts the displayed day by -1 in UTC+ timezones.
    // Parse them as local time explicitly to avoid this.
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  return date;
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
