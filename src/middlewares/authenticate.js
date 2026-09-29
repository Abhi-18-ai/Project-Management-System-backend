import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";

const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization; // Get the Authorization header from the request

  if (!authorization) {
    throw new ApiError(401, "Authentication required");
  }

  if (!authorization.startsWith("Bearer ")) {        // Check if the Authorization header starts with "Bearer "
    throw new ApiError(401, "Invalid authorization format");
  }
  const accessToken = authorization.split(" ")[1];   // Extract the access token from the Authorization header

  let decodedToken;
// Verify the access token and decode it
  try {
    decodedToken = jwt.verify(accessToken, env.accessTokenSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const userId = decodedToken.sub;// Get the user ID from the decoded token's subject (sub) claim

  if (!userId) {
    throw new ApiError(401, "Invalid access token");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }
  req.user = user;     // Attach the authenticated user to the request object for further use in the request lifecycle
  next();
};

export default authenticate;
