import prisma from "../../config/prisma.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { createUserSession } from "./session.service.js";
import { serializeStravaAppForAuthUser } from "../strava/stravaApp.service.js";

function buildHttpError(message, userMessage, httpStatus) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function serializeAuthUser(
  appUser,
  activeConnection = null,
  userStravaApp = null,
) {
  if (!appUser) {
    return null;
  }

  return {
    id: appUser.id,
    displayName: appUser.displayName,
    firstName: appUser.firstName || "",
    lastName: appUser.lastName || "",
    email: appUser.email || "",
    language: appUser.language || "fr",
    timezone: appUser.timezone || "Europe/Paris",
    themePreference: appUser.themePreference || "light",
    unitsPreference: appUser.unitsPreference || "metric",
    densityPreference: appUser.densityPreference || "comfort",
    role: appUser.role || "user",
    status: appUser.status || "active",
    lastLoginAt: appUser.lastLoginAt,
    createdAt: appUser.createdAt,
    updatedAt: appUser.updatedAt,
    stravaConnected: Boolean(activeConnection),
    stravaAthleteId: activeConnection?.stravaAthleteId || null,
    stravaConnectedAt: activeConnection?.connectedAt || null,
    stravaApp: serializeStravaAppForAuthUser(
      userStravaApp || appUser.stravaApp || null,
      activeConnection,
    ),
  };
}

function validateDisplayName(displayName) {
  const value = String(displayName || "").trim();

  if (value.length < 2) {
    throw buildHttpError(
      "Invalid display name.",
      "Le nom affiche doit contenir au moins 2 caracteres.",
      400
    );
  }

  return value;
}

function validateEmail(email) {
  const value = String(email || "").trim();
  const normalized = normalizeEmail(value);

  if (!normalized || !normalized.includes("@")) {
    throw buildHttpError(
      "Invalid email.",
      "Une adresse e-mail valide est requise.",
      400
    );
  }

  return {
    email: value,
    emailNormalized: normalized,
  };
}

// Top mots de passe les plus repandus — refus immediat (extrait HIBP top 100).
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "letmein",
  "welcome", "monkey", "dragon", "password1", "password123", "admin",
  "admin123", "iloveyou", "azerty", "azerty123", "motdepasse", "soleil",
  "12345", "123456789", "1234567890", "qwerty123", "1q2w3e4r", "11111111",
  "00000000", "987654321", "qwertyuiop", "asdfghjkl", "zxcvbnm", "passw0rd",
]);

export function validatePassword(password) {
  const value = String(password || "");

  if (value.length < 10) {
    throw buildHttpError(
      "Password too short.",
      "Le mot de passe doit contenir au moins 10 caracteres.",
      400
    );
  }

  if (value.length > 256) {
    throw buildHttpError(
      "Password too long.",
      "Le mot de passe ne doit pas depasser 256 caracteres.",
      400
    );
  }

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const score = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

  if (score < 3) {
    throw buildHttpError(
      "Password not complex enough.",
      "Le mot de passe doit combiner au moins 3 types de caracteres parmi : majuscule, minuscule, chiffre, caractere special.",
      400
    );
  }

  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    throw buildHttpError(
      "Password too common.",
      "Ce mot de passe est trop courant. Choisis-en un plus unique.",
      400
    );
  }

  return value;
}

async function findClaimableLegacyUser() {
  const registeredUserCount = await prisma.appUser.count({
    where: {
      emailNormalized: {
        not: null,
      },
    },
  });

  if (registeredUserCount > 0) {
    return null;
  }

  return prisma.appUser.findFirst({
    where: {
      emailNormalized: null,
      passwordHash: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function registerUser({ displayName, email, password, req }) {
  const safeDisplayName = validateDisplayName(displayName);
  const { email: safeEmail, emailNormalized } = validateEmail(email);
  const safePassword = validatePassword(password);

  const existingUser = await prisma.appUser.findUnique({
    where: {
      emailNormalized,
    },
  });

  if (existingUser) {
    throw buildHttpError(
      "Email already registered.",
      "Un compte existe deja avec cette adresse e-mail.",
      409
    );
  }

  const passwordHash = await hashPassword(safePassword);
  const legacyUser = await findClaimableLegacyUser();

  const user = legacyUser
    ? await prisma.appUser.update({
        where: { id: legacyUser.id },
        data: {
          displayName: safeDisplayName,
          email: safeEmail,
          emailNormalized,
          passwordHash,
          role: legacyUser.role || "user",
          status: "active",
          lastLoginAt: new Date(),
        },
      })
    : await prisma.appUser.create({
        data: {
          displayName: safeDisplayName,
          email: safeEmail,
          emailNormalized,
          passwordHash,
          role: "user",
          status: "active",
          lastLoginAt: new Date(),
        },
      });

  const { rawToken, session } = await createUserSession(user.id, req);

  return {
    user,
    rawToken,
    session,
  };
}

export async function loginUser({ email, password, req }) {
  const { emailNormalized } = validateEmail(email);
  const safePassword = validatePassword(password);

  const user = await prisma.appUser.findUnique({
    where: {
      emailNormalized,
    },
  });

  if (!user?.passwordHash) {
    throw buildHttpError(
      "Invalid credentials.",
      "Adresse e-mail ou mot de passe incorrect.",
      401
    );
  }

  const isValidPassword = await verifyPassword(safePassword, user.passwordHash);

  if (!isValidPassword) {
    throw buildHttpError(
      "Invalid credentials.",
      "Adresse e-mail ou mot de passe incorrect.",
      401
    );
  }

  if (user.status === "disabled") {
    throw buildHttpError(
      "User disabled.",
      "Ce compte est desactive.",
      403
    );
  }

  const updatedUser = await prisma.appUser.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const { rawToken, session } = await createUserSession(updatedUser.id, req);

  return {
    user: updatedUser,
    rawToken,
    session,
  };
}

export async function getCurrentAuthUser(appUserId) {
  if (!appUserId) {
    return null;
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      id: appUserId,
    },
    include: {
      connections: {
        where: {
          isActive: true,
        },
        orderBy: {
          connectedAt: "desc",
        },
        take: 1,
      },
      stravaApp: true,
    },
  });

  if (!appUser) {
    return null;
  }

  return serializeAuthUser(
    appUser,
    appUser.connections?.[0] || null,
    appUser.stravaApp || null,
  );
}
