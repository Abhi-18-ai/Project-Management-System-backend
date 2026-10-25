// // ErrorHandler middleware to handle errors in the application globally. It takes in the error object, request, response, and next function as parameters. It sets the status code based on the error's statusCode property or defaults to 500 (Internal Server Error). It then sends a JSON response with the success status, error message, and any additional errors.

// const ErrorHandler = (err, req, res, next) => {

//   console.log("ERROR NAME:", err.name);
//   console.log("ERROR MESSAGE:", err.message);
//   console.log("ERROR STACK:", err.stack);
//   const statusCode = err.statusCode || 500;

//   res.status(statusCode).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//     errors: err.errors || [],
//   });
// };

// export default ErrorHandler;

import mongoose from "mongoose";
import logger from "../config/logger.js";

const ErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Handle invalid MongoDB ObjectId
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  // Handle Mongoose schema validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  // Handle duplicate MongoDB values, such as unique email
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : "Duplicate value";
  }

  // Never expose unexpected internal errors in production
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}: ${err.stack || message}`);

    if (process.env.NODE_ENV === "production") {
      message = "Internal Server Error";
      errors = [];
    }
  } else {
    logger.warn(`${req.method} ${req.originalUrl}: ${message}`);
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [],
  });
};

export default ErrorHandler;
