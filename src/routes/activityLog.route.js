import { Router } from "express";
import { getProjectActivity } from "../controllers/activityLog.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";

const router = Router();

router.get("/:projectId/activity", authenticate, getProjectActivity);// Get activity logs for a specific project

export default router;
