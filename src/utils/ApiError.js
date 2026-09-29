// ApiError class to represent custom API errors. It extends the built-in Error class and adds additional properties such as statusCode, errors, and success. The constructor takes in the status code, error message, and an optional array of additional errors. It also captures the stack trace for better debugging.

class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);

    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;