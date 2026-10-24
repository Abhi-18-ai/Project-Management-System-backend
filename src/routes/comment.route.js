import { Router } from "express";

import {
  createComment,
  getTaskComments,
} from "../controllers/comment.controller.js";
import authenticate from "../middlewares/authenticate.js";

const router = Router();

router.post("/:projectId/tasks/:taskId/comments", authenticate, createComment);
router.get("/:projectId/tasks/:taskId/comments", authenticate, getTaskComments);

export default router;
