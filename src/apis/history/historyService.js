import { createCompanyDao, getCompanyDao } from "../companies/companiesDao.js";
import {
  createhistoryDao,
  gethistoryByLastPlayedDateDao,
  bulkCreateHistoryDao
} from "./historyDao.js";
import { getUsersByIDDao } from "../users/usersDao.js";
import { createusersDao } from "../users/usersDao.js";
import { createRecordsDao } from "../records/recordsDao.js";
import { processAnyFile } from "./csvImportService.js";

// Constants for batch processing
const BATCH_SIZE = 500;
const DUPLICATE_CHECK_BATCH_SIZE = 100;

// Helper function to process records in batches
const processBatch = async (batch, companyId) => {
  const validRecords = [];
  const duplicateCount = {count: 0};
  
  for (const payload of batch) {
    try {
      // Check for user existence
      const user = await getUsersByIDDao(payload.user_id);
      if (!user) {
        await createusersDao({ user_id: payload.user_id, company_id: companyId });
      }

      // Check for duplicates
      const data = {
        user_id: payload.user_id,
        last_played_date: payload.last_played_date,
        total_withdrawal_amount: payload.total_withdrawal_amount,
        total_deposit_amount: payload.total_deposit_amount
      };
      
      const alreadyPresentUserRecord = await gethistoryByLastPlayedDateDao(data);
      if (!alreadyPresentUserRecord) {
        validRecords.push({
          ...payload,
          company_id: companyId
        });
      } else {
        duplicateCount.count++;
        console.warn(`Duplicate entry found for user: ${payload.user_id}`);
      }
    } catch (error) {
      console.error(`Error processing record for user ${payload.user_id}:`, error);
    }
  }

  return { validRecords, duplicateCount: duplicateCount.count };
};

export const createhistoryService = async (payloadArray, records) => {
  try {
    if (!payloadArray || payloadArray.length === 0) {
      throw new Error("No records to process");
    }

    // Get or create company
    const companyName = payloadArray[0]?.company_name;
    if (!companyName) {
      throw new Error("Company name is required");
    }

    let company = await getCompanyDao({ name: companyName });
    if (!company) {
      company = await createCompanyDao({ name: companyName });
    }

    const results = [];
    let totalDuplicates = 0;
    let processedCount = 0;

    // Process records in batches for better memory management
    for (let i = 0; i < payloadArray.length; i += BATCH_SIZE) {
      const batch = payloadArray.slice(i, i + BATCH_SIZE);

      const { validRecords, duplicateCount } = await processBatch(batch, company.id);
      
      if (validRecords.length > 0) {
        // Remove company_name from records before database insertion
        const cleanedRecords = validRecords.map(record => {
          const { company_name, ...cleanRecord } = record;
          return cleanRecord;
        });

        const insertedRecords = await bulkCreateHistoryDao(cleanedRecords);
        results.push(...insertedRecords.map(record => record.id));
      }

      totalDuplicates += duplicateCount;
      processedCount += batch.length;
      
    }

    // Create record entry
    const recordData = {
      login_user_id: records.id,
      company_id: company.id,
      file: records.fileName,
    };
    await createRecordsDao(recordData);
    
    return {
      insertedCount: results.length,
      duplicateCount: totalDuplicates,
      totalProcessed: payloadArray.length,
      companyName,
      recordIds: results
    };

  } catch (error) {
    console.error("Error during bulk history creation:", error);
    throw error;
  }
};

export const createCSVImportService = async (filePath, companyId, fileExtension) => {
  try {
    const result = await processAnyFile(filePath, companyId, fileExtension);
    
    return {
      ...result,
      success: true,
      message: `Successfully processed ${result.totalProcessed} records`
    };
  } catch (error) {
    console.error('CSV import failed:', error);
    throw new Error(`Import failed: ${error.message}`);
  }
};
  
  