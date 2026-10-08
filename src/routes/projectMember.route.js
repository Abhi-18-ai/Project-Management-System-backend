import {Router} from "express";
import authenticate from "../middlewares/authenticate.js";
import requireProjectOwner from "../middlewares/projectAccess.middleware.js";
import { addProjectMember } from "../controllers/projectMember.controller.js";

const router = Router();

router.post("/:projectId/members", authenticate, requireProjectOwner, addProjectMember); // Add a member to a project (requires authentication and project ownership


export default router;