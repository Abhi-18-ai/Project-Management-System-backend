import mongoose from "mongoose";

import Comment from "../models/comment.model.js";
import Project from "../models/project.model.js";
import ProjectMember from "../models/projectMember.model.js";
import Task from "../models/task.model.js";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import logActivity from "../services/activityLog.service.js";
import createNotification from "../services/notification.service.js";

const checkProjectAccess = async (project, userId) => {
  const isOwner = project.owner.toString() === userId.toString();

  if (isOwner) {
    return { isOwner: true, role: "owner" };
  }

  const membership = await ProjectMember.findOne({
    project: project._id,
    user: userId,
  });

  if (!membership) {
    throw new ApiError(403, "You do not have access to this project");
  }

  return { isOwner: false, role: membership.role };
};

// Create a comment
const createComment = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { content } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    throw new ApiError(400, "Invalid project ID or task ID");
  }

  if (
    typeof content !== "string" ||
    content.trim().length < 1 ||
    content.trim().length > 2000
  ) {
    throw new ApiError(400, "Comment must be between 1 and 2000 characters");
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const access = await checkProjectAccess(project, req.user._id);

  if (access.role === "viewer") {
    throw new ApiError(403, "Viewers cannot create comments");
  }

  const task = await Task.findOne({
    _id: taskId,
    project: project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found in this project");
  }

  const comment = await Comment.create({
    task: task._id,
    project: project._id,
    author: req.user._id,
    content: content.trim(),
  });
  // Log the activity of creating a comment
  await logActivity({
    projectId: project._id,
    actorId: req.user._id,
    action: "comment_created",
    targetType: "comment",
    targetId: comment._id,
    details: {
      taskId: task._id,
      taskTitle: task.title,
    },
  });
  // Notify the task assignee about the new comment
  if (task.assignedTo) {
    await createNotification({
      recipientId: task.assignedTo,
      actorId: req.user._id,
      projectId: project._id,
      type: "comment_added",
      title: "New comment on your task",
      message: `A new comment was added to "${task.title}".`,
      resourceType: "comment",
      resourceId: comment._id,
    });
  }
  const populatedComment = await Comment.findById(comment._id).populate(
    "author",
    "username email avatar",
  );

  res
    .status(201)
    .json(
      new ApiResponse(201, populatedComment, "Comment created successfully"),
    );
});

// List comments for a task
const getTaskComments = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { page = "1", limit = "10" } = req.query;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    throw new ApiError(400, "Invalid project ID or task ID");
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  await checkProjectAccess(project, req.user._id);

  const task = await Task.findOne({
    _id: taskId,
    project: project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found in this project");
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new ApiError(
      400,
      "Page must be positive and limit must be between 1 and 100",
    );
  }

  const filter = {
    task: task._id,
    project: project._id,
  };

  const skip = (pageNumber - 1) * pageSize;

  const [comments, totalComments] = await Promise.all([
    Comment.find(filter)
      .populate("author", "username email avatar")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(pageSize),

    Comment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalComments / pageSize);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        pagination: {
          currentPage: pageNumber,
          pageSize,
          totalComments,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1,
        },
      },
      "Task comments fetched successfully",
    ),
  );
});

export { createComment, getTaskComments };
