import { createUsersDao,getUsersDao } from "./usersDao.js";
import { getAgentDao, createAgentDao } from "../agents/agentsDao.js";
import { createCompanyDao, getCompanyDao } from "../companies/companiesDao.js";
// import { generateUUID } from "../../utils/generateUUID.js";
export const createUsersService = async (payloadArray) => {
  try {
    const results = [];
    for (const payload of payloadArray) {
      let company = await getCompanyDao({ name: payload.company_name });
      if (!company) {
        company = await createCompanyDao({ name: payload.company_name });
      }
      payload.company_id = company.id;

      let agent = await getAgentDao({ name: payload.agent_name });
      if (!agent) {
        agent = await createAgentDao({ name: payload.agent_name });
      }
      payload.agent_id = agent.id;

      delete payload.company_name;
      delete payload.agent_name;

      const createdRecord = await createUsersDao(payload);
      results.push(createdRecord);
    }

    return results;
  } catch (error) {
    console.error(" Error during bulk user creation:", error);
    throw error;
  }
};
  
  