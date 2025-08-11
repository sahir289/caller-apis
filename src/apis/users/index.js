import express from "express";
import { createUsers } from "./usersController.js";
const router = express.Router();

router.post("/createUsers", createUsers);



export default router;
