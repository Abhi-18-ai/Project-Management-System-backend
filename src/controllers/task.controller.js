import mongoose from "mongoose";

import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import ProjectMember from "../models/projectMember.model.js";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import logActivity from "../services/activityLog.service.js";

const createTask = AsyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, status, priority, dueDate } =
    req.body;

  //  Validate project ID
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  //  Find project
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Check requester permissions
  const isOwner = project.owner.toString() === req.user._id.toString();

  let requesterMembership = null;

  if (!isOwner) {
    requesterMembership = await ProjectMember.findOne({
      project: project._id,
      user: req.user._id,
    });

    if (!requesterMembership) {
      throw new ApiError(403, "You do not have access to this project");
    }

    if (requesterMembership.role === "viewer") {
      throw new ApiError(403, "Viewers cannot create tasks");
    }
  }

  // Validate title
  if (
    typeof title !== "string" ||
    title.trim().length < 2 ||
    title.trim().length > 150
  ) {
    throw new ApiError(400, "Title must be between 2 and 150 characters");
  }

  // Validate optional fields
  if (
    description !== undefined &&
    (typeof description !== "string" || description.trim().length > 2000)
  ) {
    throw new ApiError(400, "Invalid task description");
  }

  const allowedStatuses = ["todo", "in_progress", "completed"];

  const allowedPriorities = ["low", "medium", "high", "urgent"];

  if (status !== undefined && !allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid task status");
  }

  if (priority !== undefined && !allowedPriorities.includes(priority)) {
    throw new ApiError(400, "Invalid task priority");
  }

  // Validate assignee
  if (assignedTo !== undefined && assignedTo !== null) {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw new ApiError(400, "Invalid assignee ID");
    }

    const isProjectOwner = project.owner.toString() === assignedTo.toString();

    if (!isProjectOwner) {
      const assigneeMembership = await ProjectMember.findOne({
        project: project._id,
        user: assignedTo,
      });

      if (!assigneeMembership) {
        throw new ApiError(400, "Assignee must be a member of this project");
      }
    }
  }

  // Validate due date
  let parsedDueDate = null;

  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      throw new ApiError(400, "Invalid due date");
    }
  }

  // Create task
  const task = await Task.create({
    title: title.trim(),
    description: description === undefined ? "" : description.trim(),
    project: project._id,
    assignedTo: assignedTo || null,
    createdBy: req.user._id,
    status: status || "todo",
    priority: priority || "medium",
    dueDate: parsedDueDate,
  });
  // Log activity
  await logActivity({
    projectId: project._id,
    actorId: req.user._id,
    action: "task_created",
    targetType: "task",
    targetId: task._id,
    details: {
      title: task.title,
    },
  });

  // Return response
  res.status(201).json(new ApiResponse(201, task, "Task created successfully"));
});

//get project tasks
const getProjectTasks = AsyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { page = "1", limit = "10", status } = req.query;

  //  Validate project ID
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }
  //  Find project
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  //  Check project access
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
  //  Validate pagination
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

  //  Validate optional status filter
  const allowedStatuses = ["todo", "in_progress", "completed"];

  if (status && !allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid task status");
  }

  //  Build query
  const filter = {
    project: project._id,
  };

  if (status) {
    filter.status = status;
  }

  //  Calculate pagination
  const skip = (pageNumber - 1) * pageSize;

  // Fetch tasks and total count
  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter)
      .populate("assignedTo", "username email avatar")
      .populate("createdBy", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),

    Task.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalTasks / pageSize);

  // Send response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        tasks,
        pagination: {
          currentPage: pageNumber,
          pageSize,
          totalTasks,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1,
        },
      },
      "Project tasks fetched successfully",
    ),
  );
});

//gettaskById

const getTaskById = AsyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  //  Validate IDs
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  // Find project
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  //  Check project access
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

  //  Find task inside this project
  const task = await Task.findOne({
    _id: taskId,
    project: project._id,
  })
    .populate("assignedTo", "username email avatar")
    .populate("createdBy", "username email avatar");

  if (!task) {
    throw new ApiError(404, "Task not found in this project");
  }

  // Return task details
  res.status(200).json(new ApiResponse(200, task, "Task fetched successfully"));
});

//update task
const updateTask = AsyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }
  //  Find project
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  // Check project access and role
  const isOwner = project.owner.toString() === req.user._id.toString();

  let membership = null;
  if (!isOwner) {
    membership = await ProjectMember.findOne({
      project: project._id,
      user: req.user._id,
    });

    if (!membership) {
      throw new ApiError(403, "You do not have access to this project");
    }
    if (membership.role === "viewer") {
      throw new ApiError(403, "Viewers cannot update tasks");
    }
  }

  //  Find task inside this project
  const task = await Task.findOne({
    _id: taskId,
    project: project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found in this project");
  }

  // Validate allowed fields
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "assignedTo",
    "dueDate",
  ];

  const submittedFields = Object.keys(req.body);

  if (submittedFields.length === 0) {
    throw new ApiError(400, "At least one field is required");
  }

  const invalidFields = submittedFields.filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    throw new ApiError(400, `Unsupported fields: ${invalidFields.join(", ")}`);
  }

  //  Validate and update title
  if (req.body.title !== undefined) {
    if (
      typeof req.body.title !== "string" ||
      req.body.title.trim().length < 2 ||
      req.body.title.trim().length > 150
    ) {
      throw new ApiError(400, "Title must be between 2 and 150 characters");
    }

    task.title = req.body.title.trim();
  }

  // Validate and update description
  if (req.body.description !== undefined) {
    if (
      typeof req.body.description !== "string" ||
      req.body.description.trim().length > 2000
    ) {
      throw new ApiError(400, "Invalid task description");
    }

    task.description = req.body.description.trim();
  }

  //  Validate status
  if (req.body.status !== undefined) {
    const allowedStatuses = ["todo", "in_progress", "completed"];

    if (!allowedStatuses.includes(req.body.status)) {
      throw new ApiError(400, "Invalid task status");
    }

    task.status = req.body.status;
  }

  //  Validate priority
  if (req.body.priority !== undefined) {
    const allowedPriorities = ["low", "medium", "high", "urgent"];

    if (!allowedPriorities.includes(req.body.priority)) {
      throw new ApiError(400, "Invalid task priority");
    }

    task.priority = req.body.priority;
  }
  //  Validate assignment permissions
  if (req.body.assignedTo !== undefined) {
    const isOwner = project.owner.toString() === req.user._id.toString();

    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        project: project._id,
        user: req.user._id,
      });

      if (!membership || membership.role !== "manager") {
        throw new ApiError(
          403,
          "Only project owners and managers can change task assignments",
        );
      }
    }
  }
  // Validate assignee
  if (req.body.assignedTo !== undefined) {
    const assignedTo = req.body.assignedTo;

    if (assignedTo === null) {
      // Remove the current assignment
      task.assignedTo = null;
    } else {
      if (
        typeof assignedTo !== "string" ||
        !mongoose.Types.ObjectId.isValid(assignedTo)
      ) {
        throw new ApiError(400, "Invalid assignee ID");
      }

      const isProjectOwner = project.owner.toString() === assignedTo;

      if (!isProjectOwner) {
        const assigneeMembership = await ProjectMember.findOne({
          project: project._id,
          user: assignedTo,
        });

        if (!assigneeMembership) {
          throw new ApiError(400, "Assignee must be a member of this project");
        }
      }

      task.assignedTo = assignedTo;
    }
  }

  // Validate due date
  if (req.body.dueDate !== undefined) {
    const dueDate = req.body.dueDate;

    if (dueDate === null || dueDate === "") {
      task.dueDate = null;
    } else {
      if (typeof dueDate !== "string" && typeof dueDate !== "number") {
        throw new ApiError(400, "Invalid due date");
      }

      const parsedDate = new Date(dueDate);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new ApiError(400, "Invalid due date");
      }

      task.dueDate = parsedDate;
    }
  }

  // Save changes
  await task.save();
  // Record task update activity
  await logActivity({
    projectId: project._id,
    actorId: req.user._id,
    action: "task_updated",
    targetType: "task",
    targetId: task._id,
    details: {
      title: task.title,
      updatedFields: Object.keys(req.body).filter((field) =>
        [
          "title",
          "description",
          "status",
          "priority",
          "assignedTo",
          "dueDate",
        ].includes(field),
      ),
    },
  });
  //  Return updated task
  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "username email avatar")
    .populate("createdBy", "username email avatar");

  res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

//delete task
const deleteTask = AsyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  // Find project
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Check if requester is the project owner
  const isOwner = project.owner.toString() === req.user._id.toString();

  if (!isOwner) {
    //  Find project membership
    const membership = await ProjectMember.findOne({
      project: project._id,
      user: req.user._id,
    });

    if (!membership) {
      throw new ApiError(403, "You do not have access to this project");
    }

    //  Only managers can delete tasks
    if (membership.role !== "manager") {
      throw new ApiError(
        403,
        "Only project owners and managers can delete tasks",
      );
    }
  }

  //  Find task inside the specified project
  const task = await Task.findOne({
    _id: taskId,
    project: project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found in this project");
  }

  //  Delete task
  await task.deleteOne();

  //  Return response
  res
    .status(200)
    .json(
      new ApiResponse(200, { taskId: task._id }, "Task deleted successfully"),
    );
});

// Assign or unassign a task to a user
const assignTask = AsyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  // Ensure assignedTo is present in the request
  if (!Object.prototype.hasOwnProperty.call(req.body, "assignedTo")) {
    throw new ApiError(400, "assignedTo field is required");
  }

  // Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    throw new ApiError(400, "Invalid project ID or task ID");
  }

  // Find project
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  //  Check owner or manager permission
  const isOwner = project.owner.toString() === req.user._id.toString();

  if (!isOwner) {
    const membership = await ProjectMember.findOne({
      project: project._id,
      user: req.user._id,
    });

    if (!membership) {
      throw new ApiError(403, "Project access denied");
    }

    if (membership.role !== "manager") {
      throw new ApiError(
        403,
        "Only project owners and managers can change task assignments",
      );
    }
  }

  //  Find task within the project
  const task = await Task.findOne({
    _id: taskId,
    project: project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found in this project");
  }

  const { assignedTo } = req.body;

  //  Null means unassign the task
  if (assignedTo === null) {
    task.assignedTo = null;
  } else {
    //  Validate assignee ID
    if (
      typeof assignedTo !== "string" ||
      !mongoose.Types.ObjectId.isValid(assignedTo)
    ) {
      throw new ApiError(400, "Invalid assignee ID");
    }

    // Project owner can also be assigned
    const isProjectOwner = project.owner.toString() === assignedTo;

    if (!isProjectOwner) {
      const assigneeMembership = await ProjectMember.findOne({
        project: project._id,
        user: assignedTo,
      });

      if (!assigneeMembership) {
        throw new ApiError(400, "Assignee must be a member of this project");
      }
    }

    task.assignedTo = assignedTo;
  }

  //  Save assignment
  await task.save();
  // Log activity
  await logActivity({
    projectId: project._id,
    actorId: req.user._id,
    action: "task_assigned",
    targetType: "task",
    targetId: task._id,
    details: {
      title: task.title,
      assignedTo: task.assignedTo,
    },
  });
  // Return updated task with user details
  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "username email avatar")
    .populate("createdBy", "username email avatar");

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedTask, "Task assignment updated successfully"),
    );
});

export {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
};
