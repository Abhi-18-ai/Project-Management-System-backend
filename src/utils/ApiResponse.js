// ApiResponse class to standardize API responses. It takes in the status code, data, and an optional message. The success property is determined based on the status code (less than 400 indicates success). The constructor initializes the properties accordingly.

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}

export default ApiResponse;