import User from "../models/user.model.js";
import ProjectMember from "../models/projectMember.model.js";

import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const addProjectMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  // Validate email
  if (!email) {
    throw new ApiError(400, "User email is required");
  }
  // Validate role
  const allowedRoles = ["manager", "member", "viewer"];
  if (role !== undefined && !allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid project member role");
  }
  // Find user
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  // Owner cannot be added as a member
  if (user._id.toString() === req.project.owner.toString()) {
    throw new ApiError(400, "Project owner cannot be added as a member");
  }
  // Check existing membership
  const existingMember = await ProjectMember.findOne({
    project: req.project._id,
    user: user._id,
  });
  if (existingMember) {
    throw new ApiError(409, "User is already a member of this project");
  }
  // Create membership
  const projectMember = await ProjectMember.create({
    project: req.project._id,
    user: user._id,
    role: role || "member",
  });
  res
    .status(201)
    .json(
      new ApiResponse(201, projectMember, "Project member added successfully"),
    );
});

export { addProjectMember };
