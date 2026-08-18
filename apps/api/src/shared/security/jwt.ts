import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

import { getJwtConfig, JWT_ALGORITHM } from "../../config/auth.js";
import { UserRole } from "../../generated/prisma/client.js";

interface AccessTokenIdentity {
  userId: string;
  companyId: string;
  role: UserRole;
}

export interface SignedAccessToken {
  accessToken: string;
  expiresIn: number;
}

export interface VerifiedAccessTokenIdentity {
  userId: string;
  companyId: string;
  role: UserRole;
}

export class InvalidAccessTokenError extends Error {
  constructor() {
    super("Access token is invalid");
    this.name = "InvalidAccessTokenError";
  }
}

const accessTokenClaimsSchema = z.object({
  sub: z.uuid(),
  companyId: z.uuid(),
  role: z.enum(UserRole),
  iss: z.string().min(1),
  aud: z.union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1),
  ]),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative(),
});

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

export async function verifyAccessToken(
  token: string,
): Promise<VerifiedAccessTokenIdentity> {
  const config = getJwtConfig();

  try {
    const { payload } = await jwtVerify(token, config.secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: config.issuer,
      audience: config.audience,
      requiredClaims: [
        "sub",
        "companyId",
        "role",
        "iss",
        "aud",
        "iat",
        "exp",
      ],
    });
    const validationResult = accessTokenClaimsSchema.safeParse(payload);

    if (!validationResult.success) {
      throw new InvalidAccessTokenError();
    }

    return {
      userId: validationResult.data.sub,
      companyId: validationResult.data.companyId,
      role: validationResult.data.role,
    };
  } catch {
    throw new InvalidAccessTokenError();
  }
}
