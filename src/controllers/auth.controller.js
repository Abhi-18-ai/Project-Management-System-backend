import User from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  GenerateAccessToken,
  GenerateRefreshToken,
  hashToken,
} from "../utils/Tokens.js";
import env from "../config/env.js";
import logger from "../config/logger.js";
import bcrypt from "bcryptjs";
import AsyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { registerAuthValidator } from "../validators/auth.validator.js";
import RefreshToken from "../models/refreshToken.model.js";
import {
  createRefreshTokenRecord,
  revokeTokenFamily,
} from "../services/refreshToken.service.js";

const register = AsyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input
  const errors = registerAuthValidator({ username, email, password });
  if (errors.length > 0) {
    throw new ApiError(400, "Validation failed", errors);
  }
  // Check if user already exists
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  // Create a new user
  const User = await User.create({
    username: username.trim(),
    email: normalizedEmail,
    password: passwordHash,
  });
  //prepare the response data without the password
  const safeUser = {
    _id: User._id,
    username: User.username,
    email: User.email,
    role: User.role,
    avatar: User.avatar,
    createdAt: User.createdAt,
  };
  //send the response
  res
    .status(201)
    .json(new ApiResponse(201, safeUser, "User registered successfully"));
});

//Login a user

const login = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Check if user exists
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select(
    "+password",
  );
  if (!existingUser) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate tokens
  const accessToken = GenerateAccessToken(existingUser);
  const refreshToken = GenerateRefreshToken(existingUser);
  // Set the refresh token expiration date (7 days from now)
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Create a new refresh token record in the database
  await createRefreshTokenRecord({
    user: existingUser,
    refreshToken,
    expiresAt: refreshTokenExpiresAt,
    req,
  });

  // Update last login timestamp
  existingUser.lastLoginAt = new Date();
  await existingUser.save();

  // Set the refresh token in an HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });

  // Prepare the user data to send in the response (excluding sensitive information)
  const safeUser = {
    id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
    role: existingUser.role,
    avatarUrl: existingUser.avatar,
    lastLoginAt: existingUser.lastLoginAt,
  };

  // Send the response with user data and access token
  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: safeUser,
        accessToken,
      },
      "Login successful",
    ),
  );
});

// refresh token implementation
const refreshToken = AsyncHandler(async (req, res) => {
  // Check if the refresh token is present in the cookies
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }
  // Verify the refresh token and decode it
  let decodedToken;

  // try {
  //   decodedToken = jwt.verify(refreshToken, env.refreshTokenSecret);
  // } catch (error) {
  //   throw new ApiError(401, "Invalid or expired refresh token");
  // }

  try {
    decodedToken = jwt.verify(refreshToken, env.refreshTokenSecret);
  } catch (error) {
    console.log("JWT ERROR:", error.name, error.message);

    throw new ApiError(401, "Invalid or expired refresh token");
  }
  // Check if the refresh token exists in the database and is valid
  const tokenHash = hashToken(refreshToken);
  // Find the refresh token record in the database and populate the user field
  const storedToken = await RefreshToken.findOne({
    tokenHash,
  }).populate("user");

  if (!storedToken) {
    throw new ApiError(401, "Refresh token not recognized");
  }
  // Check if the user ID in the stored token matches the decoded token's subject
  if (storedToken.user._id.toString() !== decodedToken.sub) {
    throw new ApiError(401, "Invalid refresh token");
  }
  // Check if the refresh token has been revoked or expired
  if (storedToken.revokedAt) {
    await revokeTokenFamily(storedToken.familyId);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      path: "/api/v1/auth",
    });

    throw new ApiError(
      401,
      "Refresh token reuse detected. Please login again.",
    );
  }

  // Check if the refresh token has expired
  if (storedToken.expiresAt <= new Date()) {
    throw new ApiError(401, "Refresh token has expired");
  }
  // Generate new access and refresh tokens
  const newAccessToken = GenerateAccessToken(storedToken.user);

  const newRefreshToken = GenerateRefreshToken(storedToken.user);
  // Hash the new refresh token
  const newTokenHash = hashToken(newRefreshToken);
  // Set the new expiration date for the refresh token (7 days from now)
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  storedToken.revokedAt = new Date();
  // Set the replacedByTokenHash to the new token hash
  storedToken.replacedByTokenHash = newTokenHash;
  // Save the updated stored token to the database
  await storedToken.save();
  // Create a new refresh token record in the database for the new refresh token
  await RefreshToken.create({
    user: storedToken.user._id,

    tokenHash: newTokenHash,

    familyId: storedToken.familyId,

    expiresAt: newExpiresAt,

    userAgent: req.get("user-agent") || null,

    ipAddress: req.ip || null,
  });
  // Set the new refresh token in an HTTP-only cookie
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true, // Set the HttpOnly flag to prevent client-side access to the cookie

    secure: env.nodeEnv === "production", // Set the secure flag based on the environment

    sameSite: env.nodeEnv === "production" ? "none" : "lax", // Set the sameSite attribute based on the environment

    maxAge: 7 * 24 * 60 * 60 * 1000, // Set the cookie expiration time to 7 days

    path: "/api/v1/auth", // Set the path for which the cookie is valid
  });
  // Send the response with the new access token
  res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken: newAccessToken,
      },
      "Access token refreshed successfully",
    ),
  );
});

//getme
const getMe = AsyncHandler(async (req, res) => {
  const safeUser = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    avatarUrl: req.user.avatarUrl,
    lastLoginAt: req.user.lastLoginAt,
    createdAt: req.user.createdAt,
  };

  res
    .status(200)
    .json(new ApiResponse(200, safeUser, "Current user fetched successfully"));
});

//logout
const logout = AsyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken; // getting refreshToken from cookies
  if (!refreshToken) {
    throw new ApiError(400, "Something went wrong , please try again..");
  }
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken); // hash that refreshToken by  sha256

    await RefreshToken.findOneAndUpdate(
      {
        tokenHash,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(), // revoked the current refreshToken
        },
      },
    );
  }

  res.clearCookie("refreshToken", {
    // clear the cookies
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    path: "/api/v1/auth",
  });

  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

//logout from all devices
const logoutAllDevices = AsyncHandler(async (req, res) => {
  const userId = req.user._id;
  await RefreshToken.updateMany(
    {
      user: userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    path: "/api/v1/auth",
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, null, "Logged out from all devices successfully"),
    );
});

//forgot password
const forgotPassword = AsyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({
    email: normalizedEmail,
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token
  const resetTokenHash = hashToken(resetToken);

  //  Set expiry
  const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Store hash + expiry
  user.resetPasswordTokenHash = resetTokenHash;

  user.resetPasswordExpiresAt = resetTokenExpiresAt;

  await user.save();

  // development testing
  console.log("PASSWORD RESET TOKEN:", resetToken);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset link sent successfully"));
});

//reset password
const resetPassword = AsyncHandler(async (req, res) => {
  //  Get reset token from URL
  const { token } = req.params;
  // Get new password
  const { password } = req.body;
  if (!token) {
    throw new ApiError(400, "Reset token is required");
  }
  if (!password) {
    throw new ApiError(400, "New password is required");
  }
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }
  // Hash the token received from user
  const tokenHash = hashToken(token);
  // Find user with matching token
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
  });
  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  //  Check token expiry
  if (
    !user.resetPasswordExpiresAt ||
    user.resetPasswordExpiresAt <= new Date()
  ) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);
  //  Update password
  user.password = passwordHash;
  // Remove reset token
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;

  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
});
export {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword
};
