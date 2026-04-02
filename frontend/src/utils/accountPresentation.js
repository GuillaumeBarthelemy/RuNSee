function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "RS";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function resolveDisplayName(athlete) {
  const safeAthlete = athlete || {};
  const fullName = `${safeAthlete.firstname || ""} ${safeAthlete.lastname || ""}`.trim();
  return fullName || safeAthlete.username || "Compte RuNSee";
}

function resolveIdentifier(athlete) {
  if (athlete?.username) {
    return athlete.username.startsWith("@") ? athlete.username : `@${athlete.username}`;
  }

  return "compte-local";
}

function resolveEmailDisplay(athlete) {
  if (athlete?.email) {
    return athlete.email;
  }

  if (athlete?.username && athlete.username.includes("@")) {
    return athlete.username;
  }

  return "A brancher";
}

function resolveLocation(athlete) {
  if (!athlete?.city) {
    return athlete?.country || "";
  }

  return athlete.country ? `${athlete.city}, ${athlete.country}` : athlete.city;
}

export function formatAccountDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLocaleLabel(locale = "fr-FR") {
  if (locale === "en-US") {
    return "Anglais";
  }

  return "Francais";
}

export function getDistanceUnitLabel(unit = "km") {
  return unit === "mi" ? "Miles" : "Kilometres";
}

export function getWeekStartLabel(value = "monday") {
  return value === "sunday" ? "Dimanche" : "Lundi";
}

export function buildCurrentAccountModel({ athlete = null, options = {}, summary = null } = {}) {
  const displayName = resolveDisplayName(athlete);
  const timezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  const lastSyncAt = summary?.lastIncrementalSync?.endedAt || summary?.lastHistoricalSync?.endedAt || null;

  return {
    displayName,
    initials: getInitials(displayName),
    identifier: resolveIdentifier(athlete),
    emailDisplay: resolveEmailDisplay(athlete),
    emailHint: athlete?.email || (athlete?.username && athlete.username.includes("@"))
      ? "Adresse issue du compte courant."
      : "Adresse e-mail a brancher avec le module multi-utilisateur.",
    avatarUrl: athlete?.profileMediumUrl || athlete?.profileUrl || "",
    location: resolveLocation(athlete),
    roleLabel: "Proprietaire",
    accountStatusLabel: athlete ? "Compte actif" : "Compte local",
    stravaStatusLabel: athlete ? "Strava connecte" : "Strava non connecte",
    stravaConnected: Boolean(athlete),
    localeLabel: getLocaleLabel(options.userLocale),
    distanceUnitLabel: getDistanceUnitLabel(options.userDistanceUnit),
    weekStartLabel: getWeekStartLabel(options.userWeekStartsOn),
    timezoneLabel,
    joinedAt: athlete?.createdAt || athlete?.connectedAt || null,
    lastSyncAt,
    sessionLabel: "Ce navigateur",
  };
}
