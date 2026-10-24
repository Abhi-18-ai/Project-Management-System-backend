import mongoose from "mongoose";
import AsyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import ProjectMember from "../models/projectMember.model.js";
import ActivityLog from "../models/activityLog.model.js";
import Project from "../models/project.model.js";

export const getProjectActivity = AsyncHandler(async (req, res) => {
  const { projectId } = req.params;
  //  Validate project ID
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  // Find project
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Check whether the user is owner or member
  const isOwner = project.owner.toString() === req.user._id.toString();

  if (!isOwner) {
    const membership = await ProjectMember.findOne({
      project: project._id,
      user: req.user._id,
    });

    if (!membership) {
      throw new ApiError(403, "You do not have access to this project");
    }
  }

  // Read pagination parameters
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;

  const limit = Math.min(100, Math.max(1, requestedLimit));

  const skip = (page - 1) * limit;

  // Fetch activity logs
  const [activities, totalActivities] = await Promise.all([   
    ActivityLog.find({ project: project._id })
      .populate("actor", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    ActivityLog.countDocuments({
      project: project._id,
    }),
  ]);

  //  Calculate pagination information
  const totalPages = Math.ceil(totalActivities / limit);

  // Send response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        activities,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalActivities,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Project activity fetched successfully",
    ),
  );
});
