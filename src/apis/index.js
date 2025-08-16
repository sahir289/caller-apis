// src/apis/index.js

import express from "express";
import historyRouter from "./history/index.js";
import companyRouter from "./companies/index.js";
import agentRouter from "./agents/index.js";
import cronRouter from "./cron/index.js";
import userRouter from "./users/index.js";
import loginRouter from "./login/index.js";
const router = express.Router();

// Mount the users router on /users
router.use("/history", historyRouter);
router.use("/companies", companyRouter);
router.use("/agents", agentRouter);
router.use("/cron", cronRouter);
router.use("/users", userRouter);
router.use("/login", loginRouter);

export default router;
