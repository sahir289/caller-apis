import { createCompanyDao, getCompanyDao } from "../companies/companiesDao.js";
import { createhistoryDao } from "./historyDao.js";
import { getUsersByIDDao } from "../users/usersDao.js";
import { createusersDao } from "../users/usersDao.js";

export const createhistoryService = async (payloadArray) => {
    try {
    console.log(payloadArray);
    const results = [];
    for (const payload of payloadArray) {
      let company = await getCompanyDao({ name: payload.company_name });
      console.log(company, "hey user");
      if (!company) {
        company = await createCompanyDao({ name: payload.company_name });
      }
      const user = await getUsersByIDDao( payload.user_id);
      console.log(user,"user")
      if (!user) {
        const createUser = await createusersDao({ user_id: payload.user_id , company_id: company.id });
        console.log(user,createUser, "hey user from the user");
      }
      payload.company_id = company.id;
      delete payload.company_name;
      const createdRecord = await createhistoryDao(payload);
      results.push(createdRecord.id);
    }
    return results;
  } catch (error) {
    console.error(" Error during bulk user creation:", error);
    throw error;
  }
};
  
  