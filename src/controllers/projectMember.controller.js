import User from "../models/user.model.js";
import ProjectMember from "../models/projectMember.model.js";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";

const addProjectMember = AsyncHandler(async (req, res) => {
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

// get project members
const getProjectMembers = AsyncHandler(
  async (req, res) => {
    const members = await ProjectMember.find({
      project: req.project._id,
    })
      .populate("user", "username email avatar role")  // Populate user details (username, email, avatar, role)
      .sort({
        createdAt: 1,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        members,
        "Project members fetched successfully"
      )
    );
  }
);

//update project member role--PATCH /api/v1/projects/:projectId/members/:userId

const updateProjectMemberRole = AsyncHandler(
  async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "manager",
      "member",
      "viewer",
    ];

    if (!role || !allowedRoles.includes(role)) {
      throw new ApiError(
        400,
        "Valid role is required: manager, member, viewer"
      );
    }

    const projectMember = await ProjectMember.findOne({
      project: req.project._id,
      user: userId,
    });

    if (!projectMember) {
      throw new ApiError(
        404,
        "Project member not found"
      );
    }

    projectMember.role = role;

    await projectMember.save();

    const updatedMember = await ProjectMember.findById(
      projectMember._id
    ).populate(
      "user",
      "username email avatar role"
    );

    res.status(200).json(
      new ApiResponse(
        200,
        updatedMember,
        "Project member role updated successfully"
      )
    );
  }
);


export { addProjectMember, getProjectMembers, updateProjectMemberRole };
