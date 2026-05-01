import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const PASSWORD_HASH_PREFIX = "scrypt";

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(String(password), salt, SCRYPT_KEY_LENGTH);

  return `${PASSWORD_HASH_PREFIX}:${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const value = String(storedHash || "").trim();

  if (!value) {
    return false;
  }

  const [prefix, salt, expectedHash] = value.split(":");

  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const derivedKey = await scrypt(String(password), salt, SCRYPT_KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(derivedKey);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
