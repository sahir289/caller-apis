import { createAgentService } from "./agentsService.js";
export const createAgent = async (req, res) => {
  try {
    const payload = req.body;
    const newUser = await createAgentService(payload);
    return res.status(201).json({
      message: "Agent created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create Agent" });
  }
};
