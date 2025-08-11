
// src/apis/index.js
import express from "express";
import usersRouter from "./users/index.js";
import companyRouter from "./companies/index.js";
import agentRouter from "./agents/index.js";

const router = express.Router();

// Mount the users router on /users
router.use("/users", usersRouter);
router.use("/companies", companyRouter);
router.use("/agentsrouter", agentRouter);



export default router;
