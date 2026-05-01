export function normalizeWeekStartsOn(value = "monday") {
  return String(value || "").trim().toLowerCase() === "sunday" ? "sunday" : "monday";
}

export function getWeekStartOffset(weekStartsOn = "monday") {
  return normalizeWeekStartsOn(weekStartsOn) === "sunday" ? 0 : 1;
}

export function startOfWeek(date, weekStartsOn = "monday") {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const targetWeekStart = getWeekStartOffset(weekStartsOn);
  const rawOffset = safeDate.getDay() - targetWeekStart;
  const dayOffset = rawOffset < 0 ? rawOffset + 7 : rawOffset;

  return new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate() - dayOffset);
}

export function endOfWeek(date, weekStartsOn = "monday") {
  const weekStart = startOfWeek(date, weekStartsOn);

  if (!weekStart) {
    return null;
  }

  return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
}
