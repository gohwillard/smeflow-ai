import { randomBytes, scrypt } from "node:crypto";

const SCRYPT_VERSION = 1;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt);
  const parameters = [
    `N=${SCRYPT_COST}`,
    `r=${SCRYPT_BLOCK_SIZE}`,
    `p=${SCRYPT_PARALLELIZATION}`,
    `dkLen=${SCRYPT_KEY_LENGTH}`,
  ].join(",");

  return [
    "scrypt",
    `v=${SCRYPT_VERSION}`,
    parameters,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}
