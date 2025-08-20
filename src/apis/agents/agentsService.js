import { createAgentDao } from "./agentsDao.js";
import { getAgentDao } from "./agentsDao.js";
import { getUserByUserIDDao } from "../users/usersDao.js";
import { updateUserAgentDao } from "../users/usersDao.js";

export const createAgentService = async (payload) => {
  try {
    const createdRecord = await createAgentDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service agent", error);
    throw error;
  }
};

export const pairAgentService = async (payload) => {
  try {
    for (const item of payload) {
      let userId = item.userid;
      let agentName = item.agent ? String(item.agent).toLowerCase().trim() : null;
      let agent;
      if (!agentName) {
        agent = await getAgentDao("self");
        if (!agent) {
          agent = await createAgentDao({ name: "self" });
        }
      } else {
        agent = await getAgentDao(agentName);
        if (!agent) {
          agent = await createAgentDao({ name: agentName });
        }
      }
      const agentId = agent.id;
      const user = await getUserByUserIDDao(userId);
      if (user) {
      await updateUserAgentDao(user.user_id, agentId);
      console.log(`Paired user ${user.user_id} with agent ${agent.name}`);
      }
    }
    console.log("Agents paired and users updated successfully");
    return { message: "Agents paired and users updated successfully" };
  } catch (error) {
    console.error("Error in service agent", error);
    throw error;
  }
};
  