import Project from "../models/project.model.js";
import ApiError from "../utils/ApiError.js";

const requireProjectOwner = async (req, res, next) => {   // Middleware to check if the authenticated user is the owner of the project. It retrieves the project ID from the request parameters, fetches the project from the database, and compares the owner ID with the authenticated user's ID. If the user is not the owner, it throws an ApiError with a 403 status code. If the user is the owner, it attaches the project to the request object and calls next() to proceed to the next middleware or route handler.
  const { projectId } = req.params;

  if (!projectId) { // Check if the project ID is provided in the request parameters. If not, throw an ApiError with a 400 status code indicating that the project ID is required.
    throw new ApiError(400, "Project ID is required");
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }
// Check if the authenticated user is the owner of the project. If not, throw an ApiError with a 403 status code indicating that the user does not have access to the project.
  if (project.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You do not have access to this project");
  }

  req.project = project;

  next();
};

export default requireProjectOwner;
