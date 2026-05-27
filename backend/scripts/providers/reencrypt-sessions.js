/* eslint-env node */
/**
 * Re-chiffrement des sessions provider apres rotation de cle.
 *
 * Usage :
 *   RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY=NEW_KEY \
 *   RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS=OLD_KEY \
 *   node backend/scripts/providers/reencrypt-sessions.js
 *
 * Le script :
 *   1. Liste toutes les ExternalProviderConnection avec encryptedSession non vide
 *   2. Tente de dechiffrer (essaie nouvelle cle puis ancienne)
 *   3. Re-chiffre avec la nouvelle cle (ENCRYPTION_VERSION courante)
 *   4. Persiste le nouveau payload
 *
 * Idempotent : si une connection est deja chiffree avec la nouvelle cle,
 * elle est re-chiffree avec un nouvel IV (pas de no-op stricte mais sans
 * impact, le payload reste valide).
 *
 * Une fois termine, retirer RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS
 * de l'environnement.
 */

import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import {
  decryptProviderSessionPayload,
  encryptProviderSessionPayload,
  isProviderSessionStorageReady,
} from "../../src/services/providers/providerSessionCrypto.service.js";

async function main() {
  if (!isProviderSessionStorageReady()) {
    console.error("[reencrypt] RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY n'est pas defini. Abort.");
    process.exit(1);
  }
  const hasPrevious = Boolean(String(process.env.RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS || "").trim());
  if (!hasPrevious) {
    console.warn("[reencrypt] RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS non defini.");
    console.warn("[reencrypt] Le script va seulement re-chiffrer avec la cle courante (no-op si deja en cle courante).");
  }

  const connections = await prisma.externalProviderConnection.findMany({
    where: {
      NOT: { encryptedSession: null },
    },
    select: { id: true, encryptedSession: true, providerCode: true, appUserId: true },
  });

  console.info(`[reencrypt] ${connections.length} connection(s) a traiter`);

  let ok = 0;
  let failed = 0;
  for (const c of connections) {
    try {
      const plain = decryptProviderSessionPayload(c.encryptedSession, { parseJson: false });
      const reEncrypted = encryptProviderSessionPayload(plain);
      await prisma.externalProviderConnection.update({
        where: { id: c.id },
        data: { encryptedSession: reEncrypted },
      });
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`[reencrypt] ECHEC connection ${c.id} (${c.providerCode}/${c.appUserId}) : ${err?.message}`);
    }
  }

  console.info(`[reencrypt] termine : ${ok} OK, ${failed} echec(s)`);
  if (failed > 0) process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error("[reencrypt] erreur fatale", err);
  process.exit(1);
});
