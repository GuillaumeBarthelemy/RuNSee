import {
  clearSessionCookie,
  readSessionTokenFromRequest,
  resolveSessionFromToken,
} from "../services/auth/session.service.js";

function buildAuthRequiredError() {
  const error = new Error("Authentication required.");
  error.httpStatus = 401;
  error.userMessage = "Connecte-toi pour continuer.";
  return error;
}

export async function loadAuthSession(req, res, next) {
  try {
    const rawToken = readSessionTokenFromRequest(req);

    if (!rawToken) {
      req.auth = null;
      return next();
    }

    const session = await resolveSessionFromToken(rawToken);

    if (!session?.appUser) {
      clearSessionCookie(res);
      req.auth = null;
      return next();
    }

    req.auth = {
      session,
      user: session.appUser,
      appUserId: session.appUser.id,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user?.id) {
    return next(buildAuthRequiredError());
  }

  return next();
}

export function getRequiredAuthUser(req) {
  if (!req.auth?.user?.id) {
    throw buildAuthRequiredError();
  }

  return req.auth.user;
}
