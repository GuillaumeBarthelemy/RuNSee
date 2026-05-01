function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeGranularity(granularity) {
  if (granularity === "daily") return "day";
  if (granularity === "weekly") return "week";
  return granularity || "week";
}

export function parseChartDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const monthMatch = value.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      return new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
    }

    const dayMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayMatch) {
      return new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]));
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTemporalTick(value, granularity, width) {
  const date = parseChartDate(value);
  if (!date) {
    return value;
  }

  const normalizedGranularity = normalizeGranularity(granularity);

  if (normalizedGranularity === "month") {
    return date.toLocaleDateString("fr-FR", {
      month: "short",
      year: width >= 1100 ? "2-digit" : undefined,
    });
  }

  if (width < 520) {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function buildEvenlySpacedTicks(values, maxTicks) {
  const safeValues = Array.from(new Set(values));

  if (safeValues.length <= maxTicks) {
    return safeValues;
  }

  const lastIndex = safeValues.length - 1;
  const ticks = [safeValues[0]];

  for (let step = 1; step < maxTicks - 1; step += 1) {
    const index = Math.round((step * lastIndex) / (maxTicks - 1));
    ticks.push(safeValues[index]);
  }

  ticks.push(safeValues[lastIndex]);
  return Array.from(new Set(ticks));
}

function abbreviateLabel(value, maxLength = 12) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function getTemporalSlotWidth(granularity, width) {
  const normalizedGranularity = normalizeGranularity(granularity);

  if (normalizedGranularity === "month") {
    if (width < 520) return 70;
    if (width < 860) return 82;
    return 94;
  }

  if (normalizedGranularity === "week") {
    if (width < 520) return 58;
    if (width < 860) return 72;
    if (width < 1200) return 86;
    return 96;
  }

  if (width < 520) return 62;
  if (width < 860) return 76;
  if (width < 1200) return 90;
  return 100;
}

function buildCommonAxisDisplay(width) {
  return {
    interval: 0,
    angle: 0,
    textAnchor: "middle",
    height: width < 520 ? 44 : 40,
    minTickGap: 0,
    tickMargin: width < 520 ? 8 : 10,
  };
}

export function buildTemporalAxisConfig({
  data = [],
  width = 0,
  granularity = "week",
  dateKey = "periodDate",
  fallbackKey = "label",
}) {
  const safeData = Array.isArray(data) ? data : [];
  const safeWidth = Math.max(320, Number(width || 0));
  const validValues = safeData
    .map((entry) => entry?.[dateKey])
    .filter((value) => parseChartDate(value));
  const axisDisplay = buildCommonAxisDisplay(safeWidth);

  if (!validValues.length) {
    const fallbackValues = safeData
      .map((entry) => entry?.[fallbackKey])
      .filter(Boolean);
    const maxTicks = clamp(Math.floor(safeWidth / 92), 3, 10);

    return {
      dataKey: fallbackKey,
      ticks: buildEvenlySpacedTicks(fallbackValues, maxTicks),
      tickFormatter: (value) => abbreviateLabel(value, safeWidth < 520 ? 8 : 14),
      ...axisDisplay,
    };
  }

  const normalizedGranularity = normalizeGranularity(granularity);
  const slotWidth = getTemporalSlotWidth(normalizedGranularity, safeWidth);
  const maxTicks = clamp(
    Math.floor(safeWidth / slotWidth),
    normalizedGranularity === "month" ? 4 : 5,
    normalizedGranularity === "month" ? 10 : 12,
  );

  return {
    dataKey: dateKey,
    ticks: buildEvenlySpacedTicks(validValues, maxTicks),
    tickFormatter: (value) => formatTemporalTick(value, normalizedGranularity, safeWidth),
    ...axisDisplay,
  };
}

export function buildCategoryAxisConfig({
  width = 0,
  labelKey = "label",
  shortLabelKey = "",
  preferShortLabels = false,
}) {
  const safeWidth = Math.max(320, Number(width || 0));
  const axisDisplay = buildCommonAxisDisplay(safeWidth);
  const useShortLabels = Boolean(shortLabelKey) && (preferShortLabels || safeWidth < 900);

  return {
    dataKey: useShortLabels ? shortLabelKey : labelKey,
    tickFormatter: (value) => abbreviateLabel(value, useShortLabels ? 8 : safeWidth < 520 ? 10 : 14),
    ...axisDisplay,
  };
}
