import api from "./api.js";

function unwrapUser(response) {
  return response?.data?.user ?? null;
}

/**
 * PATCH /auth/me — Met a jour les infos du compte (firstName, lastName, email,
 * language, timezone). Retourne l'utilisateur a jour.
 */
export async function updateProfile({ firstName, lastName, email, language, timezone }) {
  const response = await api.patch("/auth/me", {
    firstName,
    lastName,
    email,
    language,
    timezone,
  });
  return unwrapUser(response);
}

/**
 * PATCH /auth/preferences — Met a jour les preferences UI (theme, units, density).
 */
export async function updatePreferences({ theme, units, density }) {
  const response = await api.patch("/auth/preferences", { theme, units, density });
  return unwrapUser(response);
}

/**
 * POST /auth/password — Change le mot de passe. Revoque automatiquement les
 * autres sessions ; la session courante reste active.
 */
export async function changePassword({ oldPassword, newPassword }) {
  const response = await api.post("/auth/password", { oldPassword, newPassword });
  return response?.data || { success: false };
}

/**
 * GET /auth/sessions — Liste les sessions actives.
 */
export async function listSessions() {
  const response = await api.get("/auth/sessions");
  return response?.data?.sessions || [];
}

/**
 * DELETE /auth/sessions/:id — Revoque une session precise.
 */
export async function revokeSession(sessionId) {
  const response = await api.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
  return response?.data || { success: false };
}

/**
 * POST /auth/sessions/revoke-others — Revoque toutes les sessions sauf
 * celle en cours.
 */
export async function revokeOtherSessions() {
  const response = await api.post("/auth/sessions/revoke-others");
  return response?.data || { success: false, revokedSessionsCount: 0 };
}
