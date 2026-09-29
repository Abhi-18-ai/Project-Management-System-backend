import ApiError from "../utils/ApiError.js";

// Middleware to handle requests to routes that are not found. It creates a new ApiError with a 404 status code and a message indicating that the requested route was not found. The error is then passed to the next middleware for handling.
const notFound = (req, res, next) => {
  next(
    new ApiError(
      404,
      `Route not found: ${req.originalUrl}`
    )
  );
};

export default notFound;