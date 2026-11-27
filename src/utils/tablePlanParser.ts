import * as XLSX from 'xlsx';
import { TablePlanEntry } from '../services/firestoreService';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export interface ParsedTablePlanPreview {
  entries: TablePlanEntry[];
  fileName: string;
  delegateCount: number;
  tableCount: number;
  detectedNameColumn: string;
  detectedTableColumn: string;
  skippedRows: number;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[#._\-/:()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTableLabel(rawValue: string): string {
  const cleaned = cleanText(rawValue);
  if (!cleaned) return '';

  // Pure numeric or numeric + letter (e.g., "1", "14", "12A") -> "Table 1", "Table 14", "Table 12A"
  if (/^\d+[a-zA-Z]?$/.test(cleaned)) {
    return `Table ${cleaned.toUpperCase()}`;
  }

  // Starts with "table" (e.g., "table 5", "TABLE 12", "table: 3")
  const tablePrefixMatch = cleaned.match(/^table\s*[:#-]?\s*(.+)$/i);
  if (tablePrefixMatch && tablePrefixMatch[1]) {
    return `Table ${tablePrefixMatch[1].trim()}`;
  }

  return cleaned;
}

const FULL_NAME_EXACT = new Set([
  'name',
  'delegate',
  'delegate name',
  'delegates',
  'full name',
  'fullname',
  'attendee',
  'attendee name',
  'guest',
  'guest name',
  'person',
  'person name',
  'participant',
  'participant name',
  'member',
  'member name',
  'invitee',
  'invitee name',
]);

const FIRST_NAME_EXACT = new Set([
  'first name',
  'firstname',
  'first',
  'forename',
  'given name',
  'givenname',
]);

const LAST_NAME_EXACT = new Set([
  'last name',
  'lastname',
  'last',
  'surname',
  'family name',
  'familyname',
  'second name',
]);

const TABLE_EXACT = new Set([
  'table',
  'table number',
  'table no',
  'table num',
  'table name',
  'table id',
  'table ref',
  'table assignment',
  'assigned table',
  'seating',
  'seating table',
  'seat table',
  'dining table',
  'table allocation',
  'table #',
]);

interface ColumnMatch {
  headerRowIndex: number;
  fullNameCol: number;
  firstNameCol: number;
  lastNameCol: number;
  tableCol: number;
  detectedNameColumn: string;
  detectedTableColumn: string;
}

function detectColumns(rows: unknown[][]): ColumnMatch | null {
  const maxScanRows = Math.min(rows.length, 10);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length < 2) continue;

    let fullNameCol = -1;
    let firstNameCol = -1;
    let lastNameCol = -1;
    let tableCol = -1;

    // Pass 1: exact normalized header matches
    row.forEach((cell, colIndex) => {
      const norm = normalizeHeader(cell);
      if (!norm) return;

      if (tableCol === -1 && TABLE_EXACT.has(norm)) {
        tableCol = colIndex;
        return;
      }
      if (fullNameCol === -1 && FULL_NAME_EXACT.has(norm)) {
        fullNameCol = colIndex;
        return;
      }
      if (firstNameCol === -1 && FIRST_NAME_EXACT.has(norm)) {
        firstNameCol = colIndex;
        return;
      }
      if (lastNameCol === -1 && LAST_NAME_EXACT.has(norm)) {
        lastNameCol = colIndex;
      }
    });

    // Pass 2: flexible partial header matches for remaining unmatched columns
    row.forEach((cell, colIndex) => {
      const norm = normalizeHeader(cell);
      if (!norm) return;

      if (
        tableCol === -1 &&
        (norm.includes('table') || norm.includes('seating'))
      ) {
        tableCol = colIndex;
        return;
      }

      if (
        fullNameCol === -1 &&
        colIndex !== tableCol &&
        colIndex !== firstNameCol &&
        colIndex !== lastNameCol &&
        (norm.includes('delegate') ||
          norm.includes('attendee') ||
          norm.includes('guest') ||
          (norm.includes('name') &&
            !norm.includes('table') &&
            !norm.includes('company') &&
            !norm.includes('organisation') &&
            !norm.includes('organization') &&
            !norm.includes('brand') &&
            !norm.includes('first') &&
            !norm.includes('last') &&
            !norm.includes('sur')))
      ) {
        fullNameCol = colIndex;
      }
    });

    const hasName = fullNameCol !== -1 || firstNameCol !== -1;
    if (hasName && tableCol !== -1) {
      const detectedNameColumn =
        fullNameCol !== -1
          ? cleanText(row[fullNameCol]) || 'Name'
          : lastNameCol !== -1
            ? `${cleanText(row[firstNameCol])} + ${cleanText(row[lastNameCol])}`
            : cleanText(row[firstNameCol]) || 'First Name';
      const detectedTableColumn = cleanText(row[tableCol]) || 'Table';

      return {
        headerRowIndex: r,
        fullNameCol,
        firstNameCol,
        lastNameCol,
        tableCol,
        detectedNameColumn,
        detectedTableColumn,
      };
    }
  }

  return null;
}

export async function parseTablePlanFile(
  file: File
): Promise<ParsedTablePlanPreview> {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  if (!hasAllowedExtension) {
    throw new Error(
      'Please upload a valid Excel or CSV file (.xlsx, .xls, or .csv).'
    );
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File is too large. Please upload a spreadsheet under 5 MB.');
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
    });
  } catch {
    throw new Error(
      'Could not read this spreadsheet. Please check the file is a valid .xlsx, .xls, or .csv document.'
    );
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No worksheets were found inside this spreadsheet.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error('This spreadsheet appears to be empty.');
  }

  const match = detectColumns(rows);
  if (!match) {
    throw new Error(
      'Could not find Name and Table columns. Include headers such as "Name" (or "Delegate Name" / "First Name" + "Last Name") and "Table" (or "Table Number" / "Table Name").'
    );
  }

  const entries: TablePlanEntry[] = [];
  let skippedRows = 0;

  for (let i = match.headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const rawName =
      match.fullNameCol !== -1
        ? cleanText(row[match.fullNameCol])
        : cleanText(
            `${cleanText(row[match.firstNameCol])} ${
              match.lastNameCol !== -1 ? cleanText(row[match.lastNameCol]) : ''
            }`
          );

    const rawTable = cleanText(row[match.tableCol]);

    if (!rawName && !rawTable) {
      continue;
    }

    if (!rawName || !rawTable) {
      skippedRows += 1;
      continue;
    }

    entries.push({
      id: `seat_${entries.length + 1}`,
      name: rawName,
      table: formatTableLabel(rawTable),
    });
  }

  if (entries.length === 0) {
    throw new Error(
      'No delegate rows with both a name and a table assignment were found beneath the headers.'
    );
  }

  const uniqueTables = new Set(entries.map((e) => e.table.toLowerCase()));

  return {
    entries,
    fileName: file.name,
    delegateCount: entries.length,
    tableCount: uniqueTables.size,
    detectedNameColumn: match.detectedNameColumn,
    detectedTableColumn: match.detectedTableColumn,
    skippedRows,
  };
}
