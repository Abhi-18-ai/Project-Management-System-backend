import {Router} from "express";
import { createProject } from "../controllers/project.controller.js";
import authenticate from "../middlewares/authenticate.js";




const router = Router();

router.post("/", authenticate, createProject); // Create a new project (requires authentication)


export default router;