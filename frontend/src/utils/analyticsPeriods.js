const DEFAULT_PRESET = "90d";

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function shiftMonths(date, months) {
  const safeDate = startOfDay(date);
  const target = new Date(safeDate.getFullYear(), safeDate.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(safeDate.getDate(), lastDay));
}

export function formatDateInputValue(date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInputValue(value) {
  const parsed = toDate(value);
  return parsed ? startOfDay(parsed) : null;
}

function buildPresetRange(preset, endDate) {
  const end = startOfDay(endDate);

  switch (preset) {
    case "7d":
      return { start: addDays(end, -6), end };
    case "30d":
      return { start: addDays(end, -29), end };
    case "90d":
      return { start: addDays(end, -89), end };
    case "6m":
      return { start: addDays(shiftMonths(end, -6), 1), end };
    case "12m":
      return { start: addDays(shiftMonths(end, -12), 1), end };
    case "ytd":
      return { start: new Date(end.getFullYear(), 0, 1), end };
    default:
      return buildPresetRange(DEFAULT_PRESET, end);
  }
}

function formatRangeLabel(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = end.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
}

export function getAnalyticsPresetLabel(preset) {
  switch (preset) {
    case "7d":
      return "7 j";
    case "30d":
      return "30 j";
    case "90d":
      return "90 j";
    case "6m":
      return "6 mois";
    case "12m":
      return "12 mois";
    case "ytd":
      return "Annee en cours";
    case "custom":
      return "Personnalisee";
    default:
      return "90 j";
  }
}

export function buildAnalyticsDateRange(options = {}) {
  const {
    preset = DEFAULT_PRESET,
    customDateFrom = "",
    customDateTo = "",
    now = new Date(),
  } = options;

  if (preset === "custom") {
    const start = parseDateInputValue(customDateFrom);
    const end = parseDateInputValue(customDateTo);

    if (start && end) {
      const orderedStart = start <= end ? start : end;
      const orderedEnd = end >= start ? end : start;

      return {
        preset,
        start: orderedStart,
        end: orderedEnd,
        days: Math.max(1, Math.round((orderedEnd - orderedStart) / 86400000) + 1),
        dateFrom: formatDateInputValue(orderedStart),
        dateTo: formatDateInputValue(orderedEnd),
        label: formatRangeLabel(orderedStart, orderedEnd),
      };
    }
  }

  const fallbackRange = buildPresetRange(preset, now);

  return {
    preset: preset === "custom" ? DEFAULT_PRESET : preset,
    start: fallbackRange.start,
    end: fallbackRange.end,
    days: Math.max(1, Math.round((fallbackRange.end - fallbackRange.start) / 86400000) + 1),
    dateFrom: formatDateInputValue(fallbackRange.start),
    dateTo: formatDateInputValue(fallbackRange.end),
    label: formatRangeLabel(fallbackRange.start, fallbackRange.end),
  };
}

export function getComparisonRange(range) {
  const safeRange = range || buildAnalyticsDateRange();
  const duration = Math.max(1, Number(safeRange.days || 1));
  const end = addDays(safeRange.start, -1);
  const start = addDays(end, -(duration - 1));

  return {
    start,
    end,
    days: duration,
    dateFrom: formatDateInputValue(start),
    dateTo: formatDateInputValue(end),
    label: formatRangeLabel(start, end),
  };
}

export function getPreviousYearRange(range) {
  const safeRange = range || buildAnalyticsDateRange();
  const start = new Date(safeRange.start.getFullYear() - 1, safeRange.start.getMonth(), safeRange.start.getDate());
  const end = new Date(safeRange.end.getFullYear() - 1, safeRange.end.getMonth(), safeRange.end.getDate());

  return {
    start,
    end,
    days: Math.max(1, Math.round((end - start) / 86400000) + 1),
    dateFrom: formatDateInputValue(start),
    dateTo: formatDateInputValue(end),
    label: formatRangeLabel(start, end),
  };
}

export function getAnalyticsGranularity(range) {
  const safeRange = range || buildAnalyticsDateRange();
  return safeRange.days <= 90 ? "daily" : "weekly";
}

export const ANALYTICS_PERIOD_PRESETS = [
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
  { value: "90d", label: "90 j" },
  { value: "6m", label: "6 mois" },
  { value: "12m", label: "12 mois" },
  { value: "ytd", label: "Annee en cours" },
  { value: "custom", label: "Personnalisee" },
];

