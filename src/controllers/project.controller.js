import Project from "../models/project.model.js";
import { getCache, setCache, deleteCache } from "../utils/cache.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import asyncHandler from "../utils/AsyncHandler.js";

// Create a new project
const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Validate project name
  // if (!name || !name.trim()) {
  //   throw new ApiError(400, "Project name is required");
  // }

  if (typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Project name must be a non-empty string");
  }

  if (description !== undefined && typeof description !== "string") {
    throw new ApiError(400, "Project description must be a string");
  }

  // Create project
  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    owner: req.user._id,
  });
  await deleteCache(`projects:owner:${req.user._id}`);
  res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

//get projects
const getProjects = asyncHandler(async (req, res) => {
  const cacheKey = `projects:owner:${req.user._id}`;

  // Try to read projects from Redis.
  const cachedProjects = await getCache(cacheKey);

  if (cachedProjects !== null) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, cachedProjects, "Projects fetched successfully"),
      );
  }
  // Cache miss: fetch projects from MongoDB.
  const projects = await Project.find({
    owner: req.user._id,
  }).sort({
    createdAt: -1,
  });
  //  Store the result in Redis for 60 seconds.
  await setCache(cacheKey, projects, 60);
  //  Return the same API response format.
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

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new ApiError(400, "Project name must be a non-empty string");
    }
  }

  if (description !== undefined && typeof description !== "string") {
    throw new ApiError(400, "Project description must be a string");
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

  await deleteCache(`projects:owner:${req.user._id}`);

  res
    .status(200)
    .json(new ApiResponse(200, req.project, "Project updated successfully"));
});

//delete project
const deleteProject = asyncHandler(async (req, res) => {
  await req.project.deleteOne();
  await deleteCache(`projects:owner:${req.user._id}`);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
});
export { createProject, getProjects, getProject, updateProject, deleteProject };
