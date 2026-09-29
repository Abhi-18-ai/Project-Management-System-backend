// ErrorHandler middleware to handle errors in the application globally. It takes in the error object, request, response, and next function as parameters. It sets the status code based on the error's statusCode property or defaults to 500 (Internal Server Error). It then sends a JSON response with the success status, error message, and any additional errors.

const ErrorHandler = (err, req, res, next) => {

  console.log("ERROR NAME:", err.name);
  console.log("ERROR MESSAGE:", err.message);
  console.log("ERROR STACK:", err.stack);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
};

export default ErrorHandler;