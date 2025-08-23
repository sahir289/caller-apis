// middleware/errorHandler.js
import { HTTPError, InternalServerError } from "../utils/errorHandler.js";

export const errorHandler = (error, req, res, next) => {
  if (error instanceof HTTPError) {
    return res.status(error.status).json({
      error: error.name,
      message: error.message,
    });
  }

  console.error("Unexpected error:", error);
  const internalError = new InternalServerError("Something went wrong");
  return res.status(internalError.status).json({
    error: internalError.name,
    message: internalError.message,
  });
};
