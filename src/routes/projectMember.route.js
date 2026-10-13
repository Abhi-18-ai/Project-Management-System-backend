import {Router} from "express";
import authenticate from "../middlewares/authenticate.js";
import requireProjectOwner from "../middlewares/projectAccess.middleware.js";
import { addProjectMember , getProjectMembers ,updateProjectMemberRole ,removeProjectMember } from "../controllers/projectMember.controller.js";

const router = Router();

router.post("/:projectId/members", authenticate, requireProjectOwner, addProjectMember); // Add a member to a project (requires authentication and project ownership
router.get("/:projectId/members", authenticate, requireProjectOwner, getProjectMembers); // Get project members
router.patch("/:projectId/members/:userId", authenticate, requireProjectOwner, updateProjectMemberRole); // Update project member role
router.delete("/:projectId/members/:userId", authenticate, requireProjectOwner, removeProjectMember); // Remove project member


export default router;