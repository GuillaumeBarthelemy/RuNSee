import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  updatePreferences,
  updateProfile,
} from "../services/auth/account.service.js";
import { getCurrentAuthUser } from "../services/auth/user-auth.service.js";

function getReqAuth(req) {
  const auth = req.auth;
  if (!auth?.user?.id) {
    const err = new Error("Authentication required.");
    err.httpStatus = 401;
    err.userMessage = "Connecte-toi pour continuer.";
    throw err;
  }
  return auth;
}

export async function patchMe(req, res, next) {
  try {
    const { user } = getReqAuth(req);
    const { firstName, lastName, email, language, timezone } = req.body || {};
    await updateProfile({ appUserId: user.id, firstName, lastName, email, language, timezone });
    const fresh = await getCurrentAuthUser(user.id);
    return res.json({ user: fresh });
  } catch (error) {
    next(error);
  }
}

export async function patchPreferences(req, res, next) {
  try {
    const { user } = getReqAuth(req);
    const { theme, units, density } = req.body || {};
    await updatePreferences({ appUserId: user.id, theme, units, density });
    const fresh = await getCurrentAuthUser(user.id);
    return res.json({ user: fresh });
  } catch (error) {
    next(error);
  }
}

export async function postPassword(req, res, next) {
  try {
    const auth = getReqAuth(req);
    const { oldPassword, newPassword } = req.body || {};
    const result = await changePassword({
      appUserId: auth.user.id,
      oldPassword,
      newPassword,
      currentSessionId: auth.session?.id || null,
    });
    return res.json({ success: true, revokedSessionsCount: result.revokedSessionsCount });
  } catch (error) {
    next(error);
  }
}

export async function getSessions(req, res, next) {
  try {
    const auth = getReqAuth(req);
    const sessions = await listSessions({
      appUserId: auth.user.id,
      currentSessionId: auth.session?.id || null,
    });
    return res.json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function deleteSession(req, res, next) {
  try {
    const { user, session } = getReqAuth(req);
    const { id } = req.params;
    if (session?.id && id === session.id) {
      const err = new Error("Cannot revoke current session via this endpoint.");
      err.httpStatus = 400;
      err.userMessage = "Utilise 'Se déconnecter' pour terminer la session courante.";
      throw err;
    }
    await revokeSession({ appUserId: user.id, sessionId: id });
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function postRevokeOtherSessions(req, res, next) {
  try {
    const { user, session } = getReqAuth(req);
    const result = await revokeOtherSessions({
      appUserId: user.id,
      currentSessionId: session?.id || null,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
