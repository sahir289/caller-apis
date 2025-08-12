import express from "express";
import { createUser } from "./usersController.js";
const router = express.Router();



router.post("/createUser", createUser);




export default router;
