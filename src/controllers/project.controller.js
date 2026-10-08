import Project from "../models/project.model.js";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";
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

//get projects
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    //find the project by there owner id
    owner: req.user._id,
  }).sort({
    //sort by latest creation of project by owner
    createdAt: -1, //sort in descending order
  });

  res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

//GET /api/v1/projects/:projectId
const getProject = AsyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.project, "Project fetched successfully"));
});

//update project
const updateProject = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  if (name === undefined && description === undefined && status === undefined) {
    throw new ApiError(400, "At least one field is required to update");
  }

  if (name !== undefined && !name.trim()) {
    throw new ApiError(400, "Project name cannot be empty");
  }

  if (
    status !== undefined &&
    !["active", "completed", "archived"].includes(status)
  ) {
    throw new ApiError(400, "Invalid project status");
  }

  if (name !== undefined) {
    req.project.name = name.trim();
  }

  if (description !== undefined) {
    req.project.description = description.trim();
  }

  if (status !== undefined) {
    req.project.status = status;
  }

  await req.project.save();

  res
    .status(200)
    .json(new ApiResponse(200, req.project, "Project updated successfully"));
});

//delete project
const deleteProject = asyncHandler(async (req, res) => {
  await req.project.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
});
export { createProject, getProjects, getProject, updateProject, deleteProject };
