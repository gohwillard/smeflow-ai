const MINIMUM_JWT_SECRET_BYTES = 32;
const TTL_PATTERN = /^([1-9]\d*)(s|m|h|d)$/;

const TTL_UNIT_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

export const JWT_ALGORITHM = "HS256" as const;

export interface JwtConfig {
  secret: Uint8Array;
  issuer: string;
  audience: string;
  accessTokenTtlSeconds: number;
}

function requireEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function parseAccessTokenTtl(value: string): number {
  const match = TTL_PATTERN.exec(value);

  if (!match) {
    throw new Error(
      "JWT_ACCESS_TOKEN_TTL must use a positive integer followed by s, m, h, or d",
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof TTL_UNIT_SECONDS;
  const seconds = amount * TTL_UNIT_SECONDS[unit];

  if (!Number.isSafeInteger(seconds)) {
    throw new Error("JWT_ACCESS_TOKEN_TTL is too large");
  }

  return seconds;
}

export function getJwtConfig(): JwtConfig {
  const secretValue = requireEnvironmentValue("JWT_SECRET");
  const secret = new TextEncoder().encode(secretValue);

  if (secret.byteLength < MINIMUM_JWT_SECRET_BYTES) {
    throw new Error(
      `JWT_SECRET must contain at least ${MINIMUM_JWT_SECRET_BYTES} bytes`,
    );
  }

  return {
    secret,
    issuer: requireEnvironmentValue("JWT_ISSUER"),
    audience: requireEnvironmentValue("JWT_AUDIENCE"),
    accessTokenTtlSeconds: parseAccessTokenTtl(
      requireEnvironmentValue("JWT_ACCESS_TOKEN_TTL"),
    ),
  };
}
