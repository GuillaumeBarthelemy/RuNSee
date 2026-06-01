import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../services/auth/apiKey.service.js";

export async function listApiKeysController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const keys = await listApiKeys(user.id);
    res.json({ apiKeys: keys });
  } catch (err) { next(err); }
}

export async function createApiKeyController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { name, scopes, expiresAt } = req.body || {};
    const { rawToken, apiKey } = await createApiKey(user.id, { name, scopes, expiresAt });
    // rawToken affiché UNE SEULE FOIS — ne jamais le stocker ni le re-retourner.
    res.status(201).json({
      rawToken,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err) { next(err); }
}

export async function revokeApiKeyController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await revokeApiKey(user.id, req.params.id);
    res.json({ revoked: result });
  } catch (err) { next(err); }
}
