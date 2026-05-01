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

function resolveDisplayName(user, athlete) {
  const userDisplayName = String(user?.displayName || "").trim();

  if (userDisplayName) {
    return userDisplayName;
  }

  const safeAthlete = athlete || {};
  const fullName = `${safeAthlete.firstname || ""} ${safeAthlete.lastname || ""}`.trim();
  return fullName || safeAthlete.username || "Compte RuNSee";
}

function resolveIdentifier(user, athlete) {
  if (user?.email) {
    return user.email;
  }

  if (athlete?.username) {
    return athlete.username.startsWith("@") ? athlete.username : `@${athlete.username}`;
  }

  return "compte-local";
}

function resolveEmailDisplay(user, athlete) {
  if (user?.email) {
    return user.email;
  }

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

function getRoleLabel(role = "user") {
  return role === "admin" ? "Administrateur" : "Membre";
}

function getAccountStatusLabel(status = "active") {
  if (status === "disabled") {
    return "Compte suspendu";
  }

  if (status === "pending") {
    return "Activation requise";
  }

  return "Compte actif";
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

function resolveLastSyncAt(summary) {
  const candidates = [summary?.lastIncrementalSync?.endedAt, summary?.lastHistoricalSync?.endedAt]
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));

  if (!candidates.length) {
    return null;
  }

  return new Date(Math.max(...candidates)).toISOString();
}

export function buildCurrentAccountModel({ user = null, athlete = null, options = {}, summary = null } = {}) {
  const displayName = resolveDisplayName(user, athlete);
  const timezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  const lastSyncAt = resolveLastSyncAt(summary);
  const stravaConnected = Boolean(user?.stravaConnected || athlete);

  return {
    displayName,
    initials: getInitials(displayName),
    identifier: resolveIdentifier(user, athlete),
    emailDisplay: resolveEmailDisplay(user, athlete),
    emailHint: user?.email
      ? "Adresse utilisee pour la connexion RunNSee."
      : athlete?.email || (athlete?.username && athlete.username.includes("@"))
        ? "Adresse issue du compte connecte."
        : "Aucune adresse e-mail n'est encore rattachee a ce profil.",
    avatarUrl: athlete?.profileMediumUrl || athlete?.profileUrl || "",
    location: resolveLocation(athlete),
    roleLabel: getRoleLabel(user?.role),
    accountStatusLabel: getAccountStatusLabel(user?.status),
    stravaStatusLabel: stravaConnected ? "Strava connecte" : "Strava non connecte",
    stravaConnected,
    localeLabel: getLocaleLabel(options.userLocale),
    distanceUnitLabel: getDistanceUnitLabel(options.userDistanceUnit),
    weekStartLabel: getWeekStartLabel(options.userWeekStartsOn),
    timezoneLabel,
    joinedAt: user?.createdAt || athlete?.createdAt || athlete?.connectedAt || null,
    lastLoginAt: user?.lastLoginAt || null,
    lastSyncAt,
    sessionLabel: user ? "Ce navigateur" : "Session locale",
  };
}
