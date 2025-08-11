import { createCompanyService } from "./companiesServices.js";

export const createCompany = async (req, res) => {
  try {
      const payload = req.body;
      const newUser = await createCompanyService(payload);
    return res.status(201).json({
      message: "Company created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create Company" });
  }
};
