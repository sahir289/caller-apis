import { createUsersService } from "./usersService.js";


export const createUsers = async (req, res) => {
  try {
      const payload = req.body;
      const newUser = await createUsersService(payload);
    return res.status(201).json({
      message: "Users created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create users" });
  }
};
