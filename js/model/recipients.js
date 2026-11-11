/**
 * Recipients parsing, CSV state machine, and token resolution (pure functions).
 */

function detectDelimiter(text) {
  let inQuotes = false;
  let commas = 0;
  let semis = 0;
  let tabs = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === '\n' || ch === '\r') {
        if (commas > 0 || semis > 0 || tabs > 0) break;
      } else if (ch === ',') {
        commas++;
      } else if (ch === ';') {
        semis++;
      } else if (ch === '\t') {
        tabs++;
      }
    }
  }

  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas && semis > tabs) return ';';
  return ',';
}

export function parseCSV(rawText) {
  if (!rawText) return { columns: [], rows: [] };
  let text = rawText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const delimiter = detectDelimiter(text);
  const rawRows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (ch === '\r' || ch === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        rawRows.push(currentRow);
        currentRow = [];
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
        continue;
      } else {
        currentCell += ch;
        i++;
        continue;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rawRows.push(currentRow);
  }

  const nonEmptyRows = rawRows.filter(row => row.some(cell => cell.length > 0));
  if (nonEmptyRows.length === 0) {
    return { columns: [], rows: [] };
  }

  const rawHeaders = nonEmptyRows[0];
  const columns = [];
  const headerCounts = {};

  for (let colIdx = 0; colIdx < rawHeaders.length; colIdx++) {
    let name = rawHeaders[colIdx]?.trim();
    if (!name) {
      name = `Column ${colIdx + 1}`;
    }
    if (headerCounts[name]) {
      headerCounts[name]++;
      columns.push(`${name} ${headerCounts[name]}`);
    } else {
      headerCounts[name] = 1;
      columns.push(name);
    }
  }

  const rows = [];
  for (let r = 1; r < nonEmptyRows.length; r++) {
    const rowCells = nonEmptyRows[r];
    const rowObj = {};
    for (let c = 0; c < columns.length; c++) {
      rowObj[columns[c]] = (rowCells[c] ?? '').trim();
    }
    rows.push(rowObj);
  }

  return { columns, rows };
}

export function parseNameList(text) {
  if (!text) return { columns: ['Name'], rows: [] };
  if (text.includes('\t')) {
    return parseCSV(text);
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return {
    columns: ['Name'],
    rows: lines.map(Name => ({ Name }))
  };
}

export function detectNameColumn(columns) {
  if (!columns || columns.length === 0) return 'Name';
  const nameCol = columns.find(c => /name/i.test(c));
  return nameCol || columns[0];
}

export function resolveText(text, row) {
  if (!text) return '';
  if (!row) return text;

  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (row[trimmedKey] !== undefined) {
      return String(row[trimmedKey]);
    }
    const lowerKey = trimmedKey.toLowerCase();
    const matchedProp = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
    if (matchedProp !== undefined && row[matchedProp] !== undefined) {
      return String(row[matchedProp]);
    }
    return match;
  });
}

export function findMissingTokens(layers, columns) {
  if (!layers || !columns) return [];
  const colSet = new Set(columns.map(c => c.toLowerCase()));
  const missing = new Set();

  for (const layer of layers) {
    if (layer?.type === 'text' && typeof layer.text === 'string') {
      const matches = layer.text.matchAll(/\{([^}]+)\}/g);
      for (const match of matches) {
        const token = match[1].trim();
        if (!colSet.has(token.toLowerCase())) {
          missing.add(token);
        }
      }
    }
  }

  return Array.from(missing);
}

export function findDuplicates(rows, column) {
  if (!rows || !column) return [];
  const seen = new Map();
  const duplicates = new Set();

  for (const row of rows) {
    const val = row[column];
    if (typeof val !== 'string') continue;
    const norm = val.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!norm) continue;

    if (seen.has(norm)) {
      duplicates.add(seen.get(norm));
    } else {
      seen.set(norm, val.trim());
    }
  }

  return Array.from(duplicates);
}

export function findBlankRows(rows, column) {
  if (!rows || !column) return [];
  const blanks = [];
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][column];
    if (!val || typeof val !== 'string' || val.trim() === '') {
      blanks.push(i);
    }
  }
  return blanks;
}

export function longestRowIndex(rows, layers) {
  if (!rows || rows.length === 0) return -1;
  const tokenLayers = (layers || []).filter(
    l => l?.type === 'text' && /\{[^}]+\}/.test(l.text)
  );

  let bestIndex = 0;
  let maxLen = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let rowMax = 0;
    if (tokenLayers.length > 0) {
      for (const layer of tokenLayers) {
        const resolved = resolveText(layer.text, row);
        if (resolved.length > rowMax) {
          rowMax = resolved.length;
        }
      }
    } else {
      for (const layer of (layers || [])) {
        if (layer?.type === 'text' && layer.text) {
          const resolved = resolveText(layer.text, row);
          if (resolved.length > rowMax) rowMax = resolved.length;
        }
      }
    }

    if (rowMax > maxLen) {
      maxLen = rowMax;
      bestIndex = i;
    }
  }

  return bestIndex;
}

