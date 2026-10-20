// Bulletproof CSV parser and generator for Cricket Tournament Admin in normal JavaScript

export function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { data: [], errors: ['CSV content is empty'], headers: [] };
  }

  // Parse header line respecting quotes
  const parseLine = (text) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
  };

  const headers = parseLine(lines[0]);
  const data = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const values = parseLine(rawLine);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: expected ${headers.length} columns but found ${values.length}`);
      continue;
    }
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx];
    });
    data.push(rowObj);
  }

  return { data, errors, headers };
}

export function exportToCsv(filename, rows) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          const val = row[header] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
