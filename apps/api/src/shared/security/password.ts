import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_VERSION = 1;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const MAX_VERIFICATION_MEMORY = 256 * 1024 * 1024;

interface ScryptParameters {
  N: number;
  r: number;
  p: number;
  dkLen: number;
}

function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      parameters.dkLen,
      {
        N: parameters.N,
        r: parameters.r,
        p: parameters.p,
        maxmem: calculateMaxMemory(parameters),
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

function calculateMaxMemory(parameters: ScryptParameters): number {
  const estimatedMemory = 128 * parameters.N * parameters.r;

  if (!Number.isSafeInteger(estimatedMemory)) {
    throw new Error("Invalid scrypt memory requirement");
  }

  return Math.max(SCRYPT_MAX_MEMORY, estimatedMemory + 1024 * 1024);
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseParameters(value: string): ScryptParameters | null {
  const entries = value.split(",").map((entry) => entry.split("="));

  if (
    entries.length !== 4 ||
    entries.some(
      (entry) => entry.length !== 2 || !entry[0] || entry[1] === undefined,
    )
  ) {
    return null;
  }

  const parameterMap = new Map(entries as Array<[string, string]>);

  if (
    parameterMap.size !== 4 ||
    [...parameterMap.keys()].some(
      (key) => !["N", "r", "p", "dkLen"].includes(key),
    )
  ) {
    return null;
  }

  const N = parsePositiveInteger(parameterMap.get("N"));
  const r = parsePositiveInteger(parameterMap.get("r"));
  const p = parsePositiveInteger(parameterMap.get("p"));
  const dkLen = parsePositiveInteger(parameterMap.get("dkLen"));

  if (
    N === null ||
    r === null ||
    p === null ||
    dkLen === null ||
    N < 2 ||
    !Number.isInteger(Math.log2(N)) ||
    r > 32 ||
    p > 16 ||
    N * p > 1_048_576 ||
    dkLen > 128
  ) {
    return null;
  }

  const estimatedMemory = 128 * N * r;
  if (
    !Number.isSafeInteger(estimatedMemory) ||
    estimatedMemory + 1024 * 1024 > MAX_VERIFICATION_MEMORY
  ) {
    return null;
  }

  return { N, r, p, dkLen };
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64url");
  return decoded.toString("base64url") === value ? decoded : null;
}

function parseStoredHash(storedPasswordHash: string): {
  parameters: ScryptParameters;
  salt: Buffer;
  derivedKey: Buffer;
} | null {
  const [algorithm, version, parameterValue, saltValue, derivedKeyValue, extra] =
    storedPasswordHash.split("$");

  if (
    algorithm !== "scrypt" ||
    version !== `v=${SCRYPT_VERSION}` ||
    !parameterValue ||
    !saltValue ||
    !derivedKeyValue ||
    extra !== undefined
  ) {
    return null;
  }

  const parameters = parseParameters(parameterValue);
  const salt = decodeBase64Url(saltValue);
  const derivedKey = decodeBase64Url(derivedKeyValue);

  if (
    !parameters ||
    !salt ||
    !derivedKey ||
    salt.length < 8 ||
    salt.length > 64 ||
    derivedKey.length !== parameters.dkLen
  ) {
    return null;
  }

  return { parameters, salt, derivedKey };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LENGTH);
  const scryptParameters = {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    dkLen: SCRYPT_KEY_LENGTH,
  };
  const derivedKey = await deriveKey(password, salt, scryptParameters);
  const serializedParameters = [
    `N=${SCRYPT_COST}`,
    `r=${SCRYPT_BLOCK_SIZE}`,
    `p=${SCRYPT_PARALLELIZATION}`,
    `dkLen=${SCRYPT_KEY_LENGTH}`,
  ].join(",");

  return [
    "scrypt",
    `v=${SCRYPT_VERSION}`,
    serializedParameters,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  submittedPassword: string,
  storedPasswordHash: string,
): Promise<boolean> {
  try {
    const parsedHash = parseStoredHash(storedPasswordHash);

    if (!parsedHash) {
      return false;
    }

    const submittedDerivedKey = await deriveKey(
      submittedPassword,
      parsedHash.salt,
      parsedHash.parameters,
    );

    if (submittedDerivedKey.length !== parsedHash.derivedKey.length) {
      return false;
    }

    return timingSafeEqual(submittedDerivedKey, parsedHash.derivedKey);
  } catch {
    return false;
  }
}
