import { createAgentDao, getAgentDao } from "./agentsDao.js";
import { getUserByUserIDDao, updateUserAgentDao } from "../users/usersDao.js";
import { createRecordsDao } from "../records/recordsDao.js";

export const createAgentService = async (payload) => {
  return await createAgentDao(payload);
};

export const pairAgentService = async (payload, file) => {
  const RecordData = {
    login_user_id: file.id,
    file: file.fileName,
  };
  const create = await createRecordsDao(RecordData);
  
  for (const item of payload) {
    const userId = item.userid;
    const agentName = item.agent ? String(item.agent).toLowerCase().trim() : null;
    
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
  
  console.log("Agents paired and users updated successfully", create);
  return { message: "Agents paired and users updated successfully" };
};
  