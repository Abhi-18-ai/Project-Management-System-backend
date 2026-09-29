import jwt from "jsonwebtoken";
import env from "../config/env.js";
import user from "../models/user.model.js";


const GenerateAccessToken = (user) => {
    return jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role
        },
        env.accessTokenSecret,
        { expiresIn: env.accessTokenExpiresIn }
    );
};


const GenerateRefreshToken = (user) => {
    return jwt.sign(
        {
            sub: user._id.toString(),
        },
        env.refreshTokenSecret,
        { expiresIn: env.refreshTokenExpiresIn }
    );
};

// Function to hash a token using SHA-256
import crypto from "crypto";
const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};
export { GenerateAccessToken, GenerateRefreshToken, hashToken };