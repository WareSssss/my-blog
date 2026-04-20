import ExcelJS from 'exceljs';

export type SheetTable = {
  headers: string[];
  keyHeader: string;
  rowsByKey: Map<string, Record<string, unknown>>;
};

export type ExcelDiffPreview = {
  keyHeader: string;
  sheetName: string;
  totalA: number;
  totalB: number;
  added: number;
  removed: number;
  modified: number;
  samples: Array<{
    key: string;
    changes: Array<{ column: string; before: unknown; after: unknown }>;
  }>;
};

export type ExcelDiffDownload = {
  fileName: string;
  buffer: Buffer;
};

function normalizeHeader(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function normalizeCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function getRowCells(row: ExcelJS.Row, headerCount: number) {
  const out: unknown[] = [];
  for (let i = 1; i <= headerCount; i += 1) {
    out.push(row.getCell(i).value);
  }
  return out;
}

async function parseSheet(params: {
  buffer: Uint8Array;
  sheetIndex: number;
  headerRow: number;
  keyColumn?: string;
}): Promise<SheetTable & { sheetName: string }> {
  const wb = new ExcelJS.Workbook();
  const arrayBuffer = params.buffer.buffer.slice(
    params.buffer.byteOffset,
    params.buffer.byteOffset + params.buffer.byteLength,
  ) as ArrayBuffer;
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[params.sheetIndex];
  if (!ws) {
    throw new Error('Sheet not found');
  }

  const header = ws.getRow(params.headerRow);
  const headerValues = getRowCells(header, header.cellCount || 1).map(
    normalizeHeader,
  );
  const headers = headerValues.filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new Error('Header row is empty');
  }

  const keyHeader =
    params.keyColumn && headers.includes(params.keyColumn)
      ? params.keyColumn
      : headers[0];

  const rowsByKey = new Map<string, Record<string, unknown>>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= params.headerRow) return;
    const cells = getRowCells(row, headers.length);
    const record: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i += 1) {
      const h = headers[i];
      record[h] = normalizeCellValue(cells[i]);
    }
    const keyValue = record[keyHeader];
    const key =
      typeof keyValue === 'string'
        ? keyValue.trim()
        : typeof keyValue === 'number' || typeof keyValue === 'boolean'
          ? String(keyValue)
          : '';
    if (!key) return;
    rowsByKey.set(key, record);
  });

  return { headers, keyHeader, rowsByKey, sheetName: ws.name };
}

function computeDiff(params: { a: SheetTable; b: SheetTable }) {
  const allKeys = new Set<string>();
  for (const k of params.a.rowsByKey.keys()) allKeys.add(k);
  for (const k of params.b.rowsByKey.keys()) allKeys.add(k);

  const keys = Array.from(allKeys);
  keys.sort((x, y) => x.localeCompare(y, 'zh-Hans-CN'));

  const added: string[] = [];
  const removed: string[] = [];
  const modified = new Map<
    string,
    Array<{ column: string; before: unknown; after: unknown }>
  >();

  const compareHeaders = Array.from(
    new Set(
      [...params.a.headers, ...params.b.headers].filter(
        (h) => h && h !== params.b.keyHeader,
      ),
    ),
  );

  for (const key of keys) {
    const rowA = params.a.rowsByKey.get(key);
    const rowB = params.b.rowsByKey.get(key);
    if (!rowA && rowB) {
      added.push(key);
      continue;
    }
    if (rowA && !rowB) {
      removed.push(key);
      continue;
    }
    if (!rowA || !rowB) continue;
    const changes: Array<{ column: string; before: unknown; after: unknown }> =
      [];
    for (const col of compareHeaders) {
      const before = rowA[col];
      const after = rowB[col];
      if (normalizeCellValue(before) !== normalizeCellValue(after)) {
        changes.push({ column: col, before, after });
      }
    }
    if (changes.length > 0) {
      modified.set(key, changes);
    }
  }

  return { keys, added, removed, modified, compareHeaders };
}

export class ExcelDiffService {
  async preview(params: {
    fileA: Uint8Array;
    fileB: Uint8Array;
    keyColumn?: string;
    sheetIndex?: number;
    headerRow?: number;
  }): Promise<ExcelDiffPreview> {
    const sheetIndex = params.sheetIndex ?? 0;
    const headerRow = params.headerRow ?? 1;

    const [a, b] = await Promise.all([
      parseSheet({
        buffer: params.fileA,
        sheetIndex,
        headerRow,
        keyColumn: params.keyColumn,
      }),
      parseSheet({
        buffer: params.fileB,
        sheetIndex,
        headerRow,
        keyColumn: params.keyColumn,
      }),
    ]);

    const diff = computeDiff({ a, b: { ...b, keyHeader: a.keyHeader } });

    const samples = Array.from(diff.modified.entries())
      .slice(0, 30)
      .map(([key, changes]) => ({ key, changes: changes.slice(0, 10) }));

    return {
      keyHeader: a.keyHeader,
      sheetName: b.sheetName,
      totalA: a.rowsByKey.size,
      totalB: b.rowsByKey.size,
      added: diff.added.length,
      removed: diff.removed.length,
      modified: diff.modified.size,
      samples,
    };
  }

  async download(params: {
    fileA: Uint8Array;
    fileB: Uint8Array;
    keyColumn?: string;
    sheetIndex?: number;
    headerRow?: number;
  }): Promise<ExcelDiffDownload> {
    const sheetIndex = params.sheetIndex ?? 0;
    const headerRow = params.headerRow ?? 1;

    const [a, b] = await Promise.all([
      parseSheet({
        buffer: params.fileA,
        sheetIndex,
        headerRow,
        keyColumn: params.keyColumn,
      }),
      parseSheet({
        buffer: params.fileB,
        sheetIndex,
        headerRow,
        keyColumn: params.keyColumn,
      }),
    ]);

    const diff = computeDiff({ a, b: { ...b, keyHeader: a.keyHeader } });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'blog';
    wb.created = new Date();

    const summary = wb.addWorksheet('Summary');
    summary.addRow(['Key Column', a.keyHeader]);
    summary.addRow(['Sheet', b.sheetName]);
    summary.addRow(['Total A', a.rowsByKey.size]);
    summary.addRow(['Total B', b.rowsByKey.size]);
    summary.addRow(['Added', diff.added.length]);
    summary.addRow(['Removed', diff.removed.length]);
    summary.addRow(['Modified', diff.modified.size]);

    const newSheet = wb.addWorksheet('New');
    const headers = ['Status', a.keyHeader, ...diff.compareHeaders];
    newSheet.addRow(headers);

    const fillAdded = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D1FAE5' },
    } as const;
    const fillRemoved = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FEE2E2' },
    } as const;
    const fillChanged = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FEF9C3' },
    } as const;

    const changedByKey = diff.modified;

    for (const key of diff.keys) {
      const rowB = b.rowsByKey.get(key);
      const rowA = a.rowsByKey.get(key);
      const isAdded = !rowA && !!rowB;
      const isModified = changedByKey.has(key);
      if (!rowB) continue;

      const values = [
        isAdded ? 'added' : isModified ? 'modified' : '',
        key,
        ...diff.compareHeaders.map((h) => rowB[h] ?? ''),
      ];
      const r = newSheet.addRow(values);
      if (isAdded) {
        r.eachCell((cell) => {
          cell.fill = fillAdded;
        });
      }
      if (isModified) {
        const changes = changedByKey.get(key) ?? [];
        for (const ch of changes) {
          const idx = headers.indexOf(ch.column);
          if (idx < 0) continue;
          const cell = r.getCell(idx + 1);
          cell.fill = fillChanged;
        }
      }
    }

    const removedSheet = wb.addWorksheet('Removed');
    removedSheet.addRow(['Status', a.keyHeader, ...diff.compareHeaders]);
    for (const key of diff.removed) {
      const rowA = a.rowsByKey.get(key);
      if (!rowA) continue;
      const values = [
        'removed',
        key,
        ...diff.compareHeaders.map((h) => rowA[h] ?? ''),
      ];
      const r = removedSheet.addRow(values);
      r.eachCell((cell) => {
        cell.fill = fillRemoved;
      });
    }

    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const fileName = `excel-diff-${Date.now()}.xlsx`;
    return { fileName, buffer: Buffer.from(new Uint8Array(buffer)) };
  }
}
