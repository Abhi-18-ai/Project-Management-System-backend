// AsyncHandler is a higher-order function that wraps asynchronous request handlers to handle errors. It takes in a request handler function as an argument and returns a new function that executes the request handler and catches any errors that occur during its execution. If an error is caught, it is passed to the next middleware for error handling.

const AsyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(
      requestHandler(req, res, next)
    ).catch(next);
  };
};

export default AsyncHandler;