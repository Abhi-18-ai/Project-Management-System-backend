import crypto from "crypto";
import RefreshToken from "../models/refreshToken.model.js";
import { hashToken } from "../utils/Tokens.js";


// Function to create a new refresh token record in the database
const createRefreshTokenRecord = async ({
  user,
  refreshToken,
  expiresAt,
  req,
}) => {
  const tokenHash = hashToken(refreshToken);

  const familyId = crypto.randomUUID();

  const refreshTokenRecord = await RefreshToken.create({
    user: user._id,
    tokenHash,
    familyId,
    expiresAt,
    userAgent: req.get("user-agent") || null,
    ipAddress: req.ip || null,
  });

  return refreshTokenRecord;
};
// Function to revoke all refresh tokens in the same family
const revokeTokenFamily = async (
  familyId
) => {
  await RefreshToken.updateMany(
    {
      familyId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );
};

export { createRefreshTokenRecord, revokeTokenFamily };