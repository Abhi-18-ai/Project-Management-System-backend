import Project from "../models/project.model.js";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";


// Create a new project
const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Validate project name
  if (!name || !name.trim()) {
    throw new ApiError(400, "Project name is required");
  }

  // Create project
  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    owner: req.user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});


export { createProject };
