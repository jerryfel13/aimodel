import type { ColumnStat, DataStats } from './ai/types';

export const MAX_DATA_BYTES = 200 * 1024;
export const MAX_ROWS = 10000;
export const MAX_COLUMNS = 100;

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h, i) => h.trim() || `column_${i}`);
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? '').trim();
    });
    return obj;
  });
}

export function parseData(text: string): { format: 'csv' | 'json'; rows: Record<string, unknown>[] } {
  const trimmed = text.trim();

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;
    let arr: unknown[];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const key = Object.keys(parsed as Record<string, unknown>).find(
        (k) => Array.isArray((parsed as Record<string, unknown>)[k]),
      );
      if (!key) {
        throw new Error('JSON must be an array of objects, or an object containing an array of objects.');
      }
      arr = (parsed as Record<string, unknown>)[key] as unknown[];
    } else {
      throw new Error('JSON data must be an array of objects.');
    }

    if (!arr.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      throw new Error('JSON data must be an array of objects.');
    }
    return { format: 'json', rows: arr as Record<string, unknown>[] };
  }

  const rows = parseCSV(trimmed);
  if (rows.length === 0) {
    throw new Error('Could not parse CSV data. Ensure the first row contains headers and at least one data row.');
  }
  return { format: 'csv', rows: rows as unknown as Record<string, unknown>[] };
}

function isNumeric(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value));
}

export function computeStats(rows: Record<string, unknown>[], format: 'csv' | 'json'): DataStats {
  const columns = new Map<string, string[]>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const list = columns.get(key) ?? [];
      list.push(value === null || value === undefined ? '' : String(value));
      columns.set(key, list);
    }
  }

  const columnStats: ColumnStat[] = [...columns.entries()].map(([name, values]) => {
    const missing = values.filter((v) => v.trim() === '').length;
    const numericValues = values.filter(isNumeric).map(Number);

    if (numericValues.length >= Math.max(1, values.length * 0.5)) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
      return {
        name,
        type: 'number',
        count: values.length,
        missing,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: Math.round((sum / sorted.length) * 100) / 100,
        median,
      };
    }

    const freq = new Map<string, number>();
    for (const v of values) {
      if (v.trim() === '') continue;
      freq.set(v, (freq.get(v) ?? 0) + 1);
    }
    const topValues = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([value, count]) => ({ value, count }));

    return { name, type: 'string', count: values.length, missing, unique: freq.size, topValues };
  });

  return { format, rowCount: rows.length, columns: columnStats };
}
