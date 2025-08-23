
class HTTPError extends Error {
  constructor(status = 500, message = "Something went wrong") {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends HTTPError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}

class UnauthorizedError extends HTTPError {
  constructor(message = "Access Denied") {
    super(401, message);
  }
}

class ForbiddenError extends HTTPError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

class NotFoundError extends HTTPError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

class ConflictError extends HTTPError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

class InternalServerError extends HTTPError {
  constructor(message = "Internal server error") {
    super(500, message);
  }
}

export {
  HTTPError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
