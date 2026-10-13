import { Router } from "express";

import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
} from "../controllers/task.controller.js";
import authenticate from "../middlewares/authenticate.js";

const router = Router();

router.post("/:projectId/tasks", authenticate, createTask);
router.get("/:projectId/tasks", authenticate, getProjectTasks);
router.get("/:projectId/tasks/:taskId", authenticate, getTaskById);
router.patch("/:projectId/tasks/:taskId", authenticate, updateTask);
router.delete("/:projectId/tasks/:taskId", authenticate, deleteTask);
router.patch("/:projectId/tasks/:taskId/assignee", authenticate, assignTask);



export default router;
