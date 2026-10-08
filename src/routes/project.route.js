import {Router} from "express";
import { createProject , getProjects ,getProject , updateProject,deleteProject} from "../controllers/project.controller.js";
import authenticate from "../middlewares/authenticate.js";
import requireProjectOwner from "../middlewares/projectAccess.middleware.js";



const router = Router();

router.post("/", authenticate, createProject); // Create a new project (requires authentication)
router.get("/", authenticate, getProjects); // Get all projects for the authenticated user
router.get("/:projectId", authenticate, requireProjectOwner, getProject); // Get a specific project by ID
router.patch("/:projectId", authenticate, requireProjectOwner, updateProject); // Update a specific project by ID
router.delete("/:projectId", authenticate, requireProjectOwner, deleteProject); // Delete a specific project by ID



export default router;