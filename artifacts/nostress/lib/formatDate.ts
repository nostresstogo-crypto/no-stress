export function formatDateFr(
  date: Date | string,
  opts: { withWeekday?: boolean; short?: boolean } = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const formatted = d.toLocaleDateString("fr-FR", {
    weekday: opts.withWeekday ? "long" : undefined,
    day: "numeric",
    month: opts.short ? "short" : "long",
    year: "numeric",
  });
  return formatted.replace(/(^|\s)([a-zà-ÿ])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
}

export function formatDateEn(
  date: Date | string,
  opts: { withWeekday?: boolean; short?: boolean } = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: opts.withWeekday ? "long" : undefined,
    day: "numeric",
    month: opts.short ? "short" : "long",
    year: "numeric",
  });
}

export function formatDateLocalized(
  date: Date | string,
  lang: "fr" | "en",
  opts: { withWeekday?: boolean; short?: boolean } = {}
): string {
  return lang === "fr" ? formatDateFr(date, opts) : formatDateEn(date, opts);
}
