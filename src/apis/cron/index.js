import express from "express";
import { startUserFetchCron } from "./cron.js";
const router = express.Router();

router.get("/fetchUsers", startUserFetchCron);

export default router;
