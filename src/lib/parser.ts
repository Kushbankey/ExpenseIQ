import * as XLSX from 'xlsx';
import type { Transaction } from './types';

interface RawRow {
  Period: string | number | Date;
  Accounts: string;
  Category: string;
  Subcategory: string;
  Note: string;
  INR: number;
  'Income/Expense': string;
  Description: string;
  Amount: number;
  Currency: string;
}

export function parseExcel(buffer: ArrayBuffer): Transaction[] {
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<RawRow>(sheet);

  return rawData.map((row) => {
    const keys = Object.keys(row);
    // Handle the duplicate "Accounts" column — xlsx renames it to "Accounts_1" or similar
    const date = row.Period instanceof Date ? row.Period : new Date(row.Period);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    return {
      date,
      account: String(keys[1] ? (row as unknown as Record<string, unknown>)[keys[1]] ?? '' : row.Accounts ?? '').trim(),
      category: String(row.Category ?? '').trim(),
      subcategory: String(row.Subcategory ?? '').trim(),
      note: String(row.Note ?? '').trim(),
      type: String(row['Income/Expense'] ?? '').trim(),
      description: String(row.Description ?? '').trim(),
      amount: Number(row.Amount) || 0,
      month,
    };
  });
}
