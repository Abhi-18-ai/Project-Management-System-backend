import jwt from "jsonwebtoken";
import crypto from "crypto";
import env from "../config/env.js";

const GenerateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      jti: crypto.randomUUID(),
    },
    env.accessTokenSecret,
    { expiresIn: env.accessTokenExpiresIn },
  );
};

const GenerateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      jti: crypto.randomUUID(),
    },
    env.refreshTokenSecret,
    { expiresIn: env.refreshTokenExpiresIn },
  );
};

// Function to hash a token using SHA-256
const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export { GenerateAccessToken, GenerateRefreshToken, hashToken };