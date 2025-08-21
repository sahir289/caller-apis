import { createRecordsService, getRecordsService } from "./recordsService.js";



export const createRecords = async (req, res) => {
  try {
      const payload = req.body;
      const newUser = await createRecordsService(payload);
    return res.status(201).json({
      message: "Records created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create Record" });
  }
};


export const getRecords = async (req, res) => {
  try {
     const { page, size } = req.query;
      const filter = { page, size };
    const newUser = await getRecordsService(filter);
    return res.status(201).json({
      message: "get records successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create User" });
  }
};