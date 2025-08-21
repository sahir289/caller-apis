import { createCompanyDao, getCompanyDao } from "../companies/companiesDao.js";
import {
  createhistoryDao,
  gethistoryByLastPlayedDateDao,
} from "./historyDao.js";
import { getUsersByIDDao } from "../users/usersDao.js";
import { createusersDao } from "../users/usersDao.js";
import { createRecordsDao } from "../records/recordsDao.js";

export const createhistoryService = async (payloadArray , records) => {
  try {
    const results = [];
    let company
    for (const payload of payloadArray) {
      company = await getCompanyDao({ name: payload.company_name });
      if (!company) {
        company = await createCompanyDao({ name: payload.company_name });
      }
      const user = await getUsersByIDDao( payload.user_id);
      if (!user) {
         await createusersDao({ user_id: payload.user_id , company_id: company.id });
      }
      const data = {
        user_id: payload.user_id,
        last_played_date: payload.last_played_date,
        total_withdrawal_amount: payload.total_withdrawal_amount,
        total_deposit_amount  :payload.total_deposit_amount
      }
      const alreadyPresentUserRecord = await gethistoryByLastPlayedDateDao(data);
      if (!alreadyPresentUserRecord) {
        payload.company_id = company.id;
        delete payload.company_name;
        const createdRecord = await createhistoryDao(payload);
        results.push(createdRecord.id);
      }
     
      else {
        console.warn(`duplicate entry found in ${payload.company_name}`);
      }
    }
    let RecordData = {
      login_user_id: records.id,
      company_id: company.id,
      file: records.fileName,
    };
    await createRecordsDao(RecordData);
    return results;
  } catch (error) {
    console.error(" Error during bulk user creation:", error);
    throw error;
  }
};
  
  