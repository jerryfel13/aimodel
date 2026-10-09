import * as XLSX from 'xlsx';
import type { SpreadsheetData } from '../ai/types';

export function buildXlsx(data: SpreadsheetData): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const sheet of data.sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([
      sheet.headers,
      ...sheet.rows,
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || 'Sheet1');
  }

  const out = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}
