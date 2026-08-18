import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import { getJwtConfig, JWT_ALGORITHM } from "../../config/auth.js";
import type { UserRole } from "../../generated/prisma/client.js";

interface AccessTokenIdentity {
  userId: string;
  companyId: string;
  role: UserRole;
}

export interface SignedAccessToken {
  accessToken: string;
  expiresIn: number;
}

export async function signAccessToken(
  identity: AccessTokenIdentity,
): Promise<SignedAccessToken> {
  const config = getJwtConfig();
  const issuedAt = Math.floor(Date.now() / 1000);

  const accessToken = await new SignJWT({
    companyId: identity.companyId,
    role: identity.role,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(identity.userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + config.accessTokenTtlSeconds)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .sign(config.secret);

  return {
    accessToken,
    expiresIn: config.accessTokenTtlSeconds,
  };
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const config = getJwtConfig();
  const { payload } = await jwtVerify(token, config.secret, {
    algorithms: [JWT_ALGORITHM],
    issuer: config.issuer,
    audience: config.audience,
  });

  return payload;
}
