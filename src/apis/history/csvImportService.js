// Node.js built-in modules
import fs from 'fs/promises';
import path from 'path';

// Third-party packages
import Papa from 'papaparse';
import XLSX from 'xlsx';

// Internal utilities
import { generateUUID } from "../../utils/generateUUID.js";

// DAO imports
import { getUsersByIDDao, createusersDao } from "../users/usersDao.js";
import { getCompanyDao } from "../companies/companiesDao.js";
import { createhistoryDao } from "./historyDao.js";

// Constants
const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const HEADER_KEYWORDS = ['SR.NO', 'DATE', 'ID NAME', 'UTR', 'AMOUNT', 'STATUS', 'USERNAME', 'REMARK'];

// Helper Functions
const convertToTimestamp = (dateString) => {
  try {
    if (!dateString || dateString === '') {
      return new Date().toISOString();
    }
    
    const dateStr = dateString.toString().trim();
    
    // Handle Excel date numbers (like 45918)
    if (/^\d{5}$/.test(dateStr)) {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (parseInt(dateStr) - 2) * 24 * 60 * 60 * 1000);
      return date.toISOString();
    }
    
    // Handle various date formats
    let parsedDate;
    
    if (dateStr.includes('-')) {
      const parts = dateStr.split(' ')[0].split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          parsedDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
    } else if (dateStr.includes('/')) {
      parsedDate = new Date(dateStr);
    } else {
      parsedDate = new Date(dateStr);
    }
    
    return parsedDate.toISOString();
    
  } catch (error) {
    console.error('Date conversion error for:', dateString, error);
    return new Date().toISOString();
  }
};

const getOrCreateUser = async (userIdString, companyId) => {
  let user = await getUsersByIDDao(userIdString);
  
  if (!user) {
    const userData = {
      id: generateUUID(),
      user_id: userIdString,
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_obsolete: false
    };
    user = await createusersDao(userData);
  }
  
  return user;
};

/**
 * Parse Excel file and return rows as JSON with better handling for complex formats
 */
export const parseExcelFile = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const results = {};
    
    // Process each sheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Get raw data
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false
      });
      
      // Find the actual header row (skip summary rows)
      let headerRowIndex = -1;
      let headers = [];
      
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        const nonEmptyCount = row.filter(cell => cell && cell.toString().trim() !== '').length;
        
        // Look for rows that look like headers
        if (nonEmptyCount >= 3) {
          const potentialHeaders = row.filter(cell => cell && cell.toString().trim() !== '');
          
          // Check if this looks like a header row
          const hasHeaderKeywords = potentialHeaders.some(header => 
            ['SR.NO', 'DATE', 'ID NAME', 'UTR', 'AMOUNT', 'STATUS', 'USERNAME', 'REMARK'].includes(header.toString().toUpperCase())
          );
          
          if (hasHeaderKeywords) {
            headerRowIndex = i;
            headers = row.map((cell, index) => cell && cell.toString().trim() !== '' ? cell.toString().trim() : `Column_${index}`);
            break;
          }
        }
      }
      
      if (headerRowIndex >= 0) {
        // Convert to proper JSON using detected headers
        const dataRows = rawData.slice(headerRowIndex + 1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== '') {
              obj[header] = row[index].toString().trim();
            }
          });
          return obj;
        }).filter(row => {
          // Filter out empty rows
          return Object.values(row).some(value => value && value !== '');
        });
        
        results[sheetName] = dataRows;
      } else {
        // Fallback: use first row as headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false
        }).filter(row => {
          return Object.values(row).some(value => value && value.toString().trim() !== '');
        });
        
        results[sheetName] = jsonData;
      }
    });
    
    return results;
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
};

/**
 * Parse CSV file and return rows as JSON
 */
export const parseCSVFile = async (filePath) => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // Clean headers
        transform: (value) => value ? value.trim() : '', // Clean values
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to read CSV file: ${error.message}`);
  }
};

/**
 * Detect file type and parse accordingly
 */
export const parseFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  // If ext is empty, try to get it from the filename part
  if (!ext) {
    const filename = path.basename(filePath);
    const filenameExt = path.extname(filename).toLowerCase();
    if (filenameExt) {
      if (filenameExt === '.csv') {
        return { 'CSV': await parseCSVFile(filePath) };
      } else if (['.xlsx', '.xls'].includes(filenameExt)) {
        return await parseExcelFile(filePath);
      }
    }
  }
  
  if (ext === '.csv') {
    return { 'CSV': await parseCSVFile(filePath) };
  } else if (['.xlsx', '.xls'].includes(ext)) {
    return await parseExcelFile(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }
};







/**
 * Transform payin CSV row to history record
 */
const transformPayinRow = async (row, selectedCompany) => {
  try {
    // Use the selected company instead of extracting merchant code
    const company = selectedCompany;
    
    // Ensure user exists
    const user = await getOrCreateUser(row.User, company.id);
    
    const historyRecord = {
      id: generateUUID(),
      user_id: user.id,
      played_at: convertToTimestamp(row['Updated At']),
      amount: parseFloat(row['Recieved Amount'] || row['Requested Amount'] || 0),
      type: 'PAYIN',
      status: row.Status?.toUpperCase() || 'PENDING',
      config: JSON.stringify({
        original_id: row.Id,
        upi_short_code: row['UPI Short Code'],
        commission: parseFloat(row['PayIn Merchant Commission'] || 0),
        requested_amount: parseFloat(row['Requested Amount'] || 0),
        received_amount: parseFloat(row['Recieved Amount'] || 0),
        bank_utr: row['Bank UTR'],
        bank_name: row['Bank Name'],
        vendor_code: row['Vendor Code'],
        original_merchant_code: row['Merchant Code'] || 'N/A',
        selected_company_name: company.name,
        merchant_order_id: row['Merchant Order ID'],
        updated_at: row['Updated At'],
        created_at: row['Created At']
      }),
      created_at: convertToTimestamp(row['Created At']),
      updated_at: convertToTimestamp(row['Updated At']),
      is_obsolete: false,
      company_id: company.id
    };
    
    return historyRecord;
  } catch (error) {
    console.error('Error transforming payin row:', error);
    throw error;
  }
};

/**
 * Transform payout CSV row to history record
 */
const transformPayoutRow = async (row, selectedCompany) => {
  try {
    // Use the selected company instead of extracting merchant code
    const company = selectedCompany;
    
    // Ensure user exists
    const user = await getOrCreateUser(row.User, company.id);
    
    // Map APPROVED to SUCCESS for consistency
    const status = row.Status?.toUpperCase() === 'APPROVED' ? 'SUCCESS' : row.Status?.toUpperCase() || 'PENDING';
    
    const historyRecord = {
      id: generateUUID(),
      user_id: user.id,
      played_at: convertToTimestamp(row['Updated At']),
      amount: parseFloat(row['Requested Amount'] || 0),
      type: 'PAYOUT',
      status: status,
      config: JSON.stringify({
        sno: row.SNO,
        original_merchant_code: row['Merchant Code'] || 'N/A',
        selected_company_name: company.name,
        merchant_order_id: row['Merchant Order ID'],
        commission: parseFloat(row['Payout Commission'] || 0),
        utr: row.UTR,
        description: row.Description,
        vendor_code: row['Vendor Code'],
        nick_name: row['Nick Name'],
        updated_at: row['Updated At'],
        created_at: row['Created At']
      }),
      created_at: convertToTimestamp(row['Created At']),
      updated_at: convertToTimestamp(row['Updated At']),
      is_obsolete: false,
      company_id: company.id
    };
    
    return historyRecord;
  } catch (error) {
    console.error('Error transforming payout row:', error);
    throw error;
  }
};

/**
 * Process any file type (CSV/Excel) - handles multiple sheets
 * Now uses a selected company ID instead of extracting merchant codes
 */

/**
 * Detect sheet type based on headers and content
 */
const detectSheetType = (rows, headers, sheetName = '') => {
  if (rows.length === 0) {
    return 'unknown';
  }
  
  // Convert headers to lowercase for easier matching
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const lowerSheetName = sheetName.toLowerCase();
  
  // Manual Withdraw Agent detection
  if (lowerHeaders.includes('username') && 
      lowerHeaders.includes('withdrawname') && 
      lowerHeaders.includes('paymentdate') &&
      lowerHeaders.includes('accountdata')) {
    return 'manual_withdraw';
  }
  
  // Deposit sheet detection
  if (lowerSheetName.includes('deposit') || 
      (lowerHeaders.includes('id name') && lowerHeaders.includes('refill'))) {
    return 'deposit_sheet';
  }
  
  // Withdrawal sheet detection  
  if (lowerSheetName.includes('withdrawal') ||
      (lowerHeaders.includes('id name') && lowerHeaders.includes('point'))) {
    return 'withdrawal_sheet';
  }
  
  // Payin detection (original CSV format)
  if (lowerHeaders.includes('payin merchant commission') || 
      lowerHeaders.includes('bank utr') ||
      lowerHeaders.includes('recieved amount')) {
    return 'payin';
  }
  
  // Payout detection (original CSV format)
  if (lowerHeaders.includes('payout commission') || 
      lowerHeaders.includes('sno') ||
      (lowerHeaders.includes('merchant order id') && lowerHeaders.includes('requested amount'))) {
    return 'payout';
  }
  
  // Additional generic types
  if (lowerHeaders.includes('transaction id') && lowerHeaders.includes('wallet balance')) {
    return 'wallet_statement';
  }
  
  if (lowerHeaders.includes('game id') || lowerHeaders.includes('game name')) {
    return 'game_history';
  }
  
  if (lowerHeaders.includes('bonus amount') || lowerHeaders.includes('bonus type')) {
    return 'bonus_history';
  }
  
  return 'unknown';
};

/**
 * Transform Manual Withdraw Agent row to history record
 */
const transformManualWithdrawRow = async (row, selectedCompany) => {
  try {
    // Use the selected company directly
    const company = selectedCompany;
    
    const user = await getOrCreateUser(row.UserName, company.id);
    
    const historyRecord = {
      id: generateUUID(),
      user_id: user.id,
      played_at: convertToTimestamp(row.PaymentDate),
      amount: parseFloat(row.Amount || 0),
      type: 'MANUAL_WITHDRAW',
      status: row.Status?.toUpperCase() === 'SUCCESS' ? 'SUCCESS' : row.Status?.toUpperCase() || 'PENDING',
      config: JSON.stringify({
        withdraw_name: row.WithdrawName,
        remark: row.Remark,
        entry_by: row.EnteryBy,
        agent_remark: row.AgentRemark,
        account_data: row.AccountData,
        merchant_code: company.name
      }),
      created_at: new Date().toISOString(),
      updated_at: convertToTimestamp(row.PaymentDate),
      is_obsolete: false,
      company_id: company.id
    };
    
    return historyRecord;
  } catch (error) {
    console.error('Error transforming manual withdraw row:', error);
    throw error;
  }
};

/**
 * Transform deposit sheet row to history record
 */
const transformDepositSheetRow = async (row, selectedCompany) => {
  try {
    // Handle different column names
    const userId = row['ID NAME'] || row.UserName || row.User || '';
    const dateField = row.DATE || row.Date || '';
    const amountField = row.AMOUNT || row.Amount || '0';
    const utrField = row.UTR || row.Utr || '';
    const statusField = row.STATUS || row.Status || 'PENDING';
    const bankField = row.BANK || row.Bank || '';
    const siteField = row.SITE || row.Site || '';
    
    if (!userId) {
      throw new Error('No user ID found in deposit row');
    }
    
    // Use the selected company directly
    const company = selectedCompany;
    
    const user = await getOrCreateUser(userId, company.id);
    
    const historyRecord = {
      id: generateUUID(),
      user_id: user.id,
      played_at: convertToTimestamp(dateField),
      amount: parseFloat(amountField) || 0,
      type: 'DEPOSIT',
      status: statusField.toUpperCase() || 'PENDING',
      config: JSON.stringify({
        utr: utrField,
        bank: bankField,
        site: siteField,
        refill: row.REFILL || row.Refill || '',
        merchant_code: company.name
      }),
      created_at: new Date().toISOString(),
      updated_at: convertToTimestamp(dateField),
      is_obsolete: false,
      company_id: company.id
    };
    
    return historyRecord;
  } catch (error) {
    console.error('Error transforming deposit row:', error);
    throw error;
  }
};

/**
 * Transform withdrawal sheet row to history record
 */
const transformWithdrawalSheetRow = async (row, selectedCompany) => {
  try {
    // Handle different column names
    const userId = row['ID NAME'] || row.UserName || row.User || '';
    const dateField = row.DATE || row.Date || '';
    const amountField = row.AMOUNT || row.Amount || '0';
    const utrField = row.UTR || row.Utr || '';
    const statusField = row.STATUS || row.Status || 'PENDING';
    const bankField = row.BANK || row.Bank || '';
    const panelField = row.PANEL || row.ANNA777 || row.Site || '';
    
    if (!userId) {
      throw new Error('No user ID found in withdrawal row');
    }
    
    // Use the selected company directly
    const company = selectedCompany;
    
    const user = await getOrCreateUser(userId, company.id);
    
    const historyRecord = {
      id: generateUUID(),
      user_id: user.id,
      played_at: convertToTimestamp(dateField),
      amount: parseFloat(amountField) || 0,
      type: 'WITHDRAWAL',
      status: statusField.toUpperCase() || 'PENDING',
      config: JSON.stringify({
        utr: utrField,
        bank: bankField,
        panel: panelField,
        point: row.POINT || row.Point || '',
        merchant_code: company.name
      }),
      created_at: new Date().toISOString(),
      updated_at: convertToTimestamp(dateField),
      is_obsolete: false,
      company_id: company.id
    };
    
    return historyRecord;
  } catch (error) {
    console.error('Error transforming withdrawal row:', error);
    throw error;
  }
};
const transformGenericRow = async (row, selectedCompany, sheetType) => {
  try {
    // Try to find common fields
    const userField = row.User || row.user || row['User ID'] || row.user_id || row.UserName || row['ID NAME'] || '';
    const amountField = row.Amount || row.amount || row['Transaction Amount'] || 
                       row['Requested Amount'] || row['Received Amount'] || '0';
    const dateField = row['Updated At'] || row['Created At'] || row.Date || 
                     row.date || row.PaymentDate || new Date().toISOString();
    const statusField = row.Status || row.status || 'COMPLETED';
    
    if (!userField) {
      throw new Error('No user field found in row');
    }
    
    // Use the selected company directly
    const company = selectedCompany;
    
    // Ensure user exists
    const user = await getOrCreateUser(userField, company.id);
    
    const historyRecord = {
      id: generateUUID(),
      user_id: user.id,
      played_at: typeof dateField === 'string' ? convertToTimestamp(dateField) : new Date().toISOString(),
      amount: parseFloat(amountField) || 0,
      type: sheetType.toUpperCase(),
      status: statusField.toUpperCase() || 'COMPLETED',
      config: JSON.stringify({
        sheet_type: sheetType,
        original_original_merchant_code: row['Merchant Code'] || 'N/A' || row.MerchantCode || row.SITE || row.Site || row.PANEL || row.Panel || 'N/A',
        selected_company_name: company.name,
        original_data: row
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_obsolete: false,
      company_id: company.id
    };
    
    return historyRecord;
  } catch (error) {
    console.error('Error transforming generic row:', error);
    throw error;
  }
};

/**
 * Process any file type (CSV/Excel) - handles multiple sheets
 * Now uses a selected company ID instead of extracting merchant codes
 */
export const processAnyFile = async (filePath, companyId, fileExtension) => {
  try {
    // Validate company ID is provided
    if (!companyId) {
      throw new Error('Company ID is required for import');
    }
    
    // Parse file based on extension
    let sheetsData;
    if (fileExtension === '.csv') {
      const csvData = await parseCSVFile(filePath);
      sheetsData = { 'CSV': csvData };
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      sheetsData = await parseExcelFile(filePath);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
    
    // Get company by ID (no longer create companies dynamically)
    const company = await getCompanyDao({ id: companyId });
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }
    
    const allResults = {
      success: true,
      sheets: {},
      totalProcessed: 0,
      totalInserted: 0,
      totalErrors: 0,
      allInsertedIds: []
    };
    
    // Process each sheet
    for (const [sheetName, rows] of Object.entries(sheetsData)) {
      try {
        if (rows.length === 0) {
          continue;
        }
        
        // Detect sheet type
        const headers = Object.keys(rows[0]);
        const sheetType = detectSheetType(rows, headers, sheetName);
        
        // Transform rows based on detected type
        const historyRecords = [];
        const errors = [];
        
        for (let i = 0; i < rows.length; i++) {
          try {
            let record;
            
            switch (sheetType) {
              case 'payin':
                record = await transformPayinRow(rows[i], company);
                break;
              case 'payout':
                record = await transformPayoutRow(rows[i], company);
                break;
              case 'manual_withdraw':
                record = await transformManualWithdrawRow(rows[i], company);
                break;
              case 'deposit_sheet':
                record = await transformDepositSheetRow(rows[i], company);
                break;
              case 'withdrawal_sheet':
                record = await transformWithdrawalSheetRow(rows[i], company);
                break;
              case 'wallet_statement':
              case 'game_history':
              case 'bonus_history':
              case 'unknown':
              default:
                record = await transformGenericRow(rows[i], company, sheetType);
                break;
            }
            
            historyRecords.push(record);
          } catch (error) {
            console.error(`Error processing ${sheetName} row ${i + 1}:`, error.message);
            errors.push({ sheet: sheetName, row: i + 1, error: error.message, data: rows[i] });
          }
        }
        
        // Insert records for this sheet
        const insertedIds = [];
        for (const record of historyRecords) {
          try {
            const inserted = await createhistoryDao(record);
            insertedIds.push(inserted.id);
          } catch (error) {
            console.error(`Error inserting ${sheetName} record:`, error.message);
            errors.push({ sheet: sheetName, record: record.id, error: error.message });
          }
        }
        
        // Store results for this sheet
        allResults.sheets[sheetName] = {
          sheetType: sheetType,
          processed: rows.length,
          inserted: insertedIds.length,
          errors: errors,
          insertedIds: insertedIds
        };
        
        allResults.totalProcessed += rows.length;
        allResults.totalInserted += insertedIds.length;
        allResults.totalErrors += errors.length;
        allResults.allInsertedIds.push(...insertedIds);
        
      } catch (sheetError) {
        console.error(`Error processing sheet ${sheetName}:`, sheetError);
        allResults.sheets[sheetName] = {
          sheetType: 'error',
          processed: 0,
          inserted: 0,
          errors: [{ error: sheetError.message }],
          insertedIds: []
        };
        allResults.totalErrors += 1;
      }
    }
    
    return allResults;
    
  } catch (error) {
    console.error('File processing failed:', error);
    throw error;
  }
};

