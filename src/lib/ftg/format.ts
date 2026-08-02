export function formatMoney(amount: number, currency: string, locale = "es-AR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale = "es-AR") {
  return new Intl.NumberFormat(locale).format(value);
}

export function relativeTime(date: string | Date | null | undefined) {
  if (!date) return "sin datos";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.round((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return "hace instantes";
  if (diff < 60) return `hace ${diff} min`;
  const hours = Math.round(diff / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}