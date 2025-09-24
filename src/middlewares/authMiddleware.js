import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errorHandler.js";

const authMiddleware = async (req, res, next) => {
  try {
      const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }
    const token = authHeader.split(" ")[1];

    // Validate token format before verification
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedError("Invalid token format");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      user_name: decoded.user_name,
    };
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error.message);
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new UnauthorizedError("Invalid token");
    }
    throw error;
  }
};

export default authMiddleware;
