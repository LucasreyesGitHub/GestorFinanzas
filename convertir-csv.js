// Convierte tus CSVs mensuales al formato de importación de la app
// Uso: node convertir-csv.js "Registros 2025 - Enero 2025.csv"
//      node convertir-csv.js  (procesa todos los .csv de la carpeta)

const fs = require('fs');

function parseAmount(cell) {
  if (!cell || !cell.includes('$')) return null;
  const s = cell.replace(/[\$ ]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(s);
  return isNaN(val) || val <= 0 ? null : Math.round(val);
}

function parseDate(s) {
  s = s.trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseCSV(content) {
  // Strip BOM if present
  content = content.replace(/^﻿/, '');
  const rows = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    const row = [];
    let inQuote = false;
    let current = '';
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        row.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

const SECTION_MAP = {
  'ingresos': 'Ingreso',
  'egresos': 'Gasto',
  'salidas': 'Gasto',
};

const AHORRO_KEYWORDS = ['bitcoin', 'pase a dolares', 'traspaso a usd', 'plazo fijo'];

const SKIP_PATTERNS = [
  /^\s*$/,
  /^\$/,
  /^-?\$?\s*\d/,
  /^\(/,
  /^ahorro /i,
  /^saldo/i,
  /^poner saldo/i,
  /^mando /i,
  /^tener en cuenta/i,
  /^tota/i,
];

function convert(inputFile) {
  const outputFile = inputFile.replace(/\.csv$/i, '_import.csv');

  let content;
  try {
    content = fs.readFileSync(inputFile, 'utf-8');
  } catch {
    try {
      content = fs.readFileSync(inputFile, 'latin1');
    } catch (e) {
      console.error(`No se pudo leer ${inputFile}: ${e.message}`);
      return;
    }
  }

  const rows = parseCSV(content);
  if (rows.length < 2) {
    console.error(`Archivo con pocas filas: ${inputFile}`);
    return;
  }

  // Fila 2 (índice 1) contiene las fechas
  const dateCols = {};
  rows[1].forEach((cell, i) => {
    const d = parseDate(cell);
    if (d) dateCols[i] = d;
  });

  const transactions = [];
  let currentTipo = 'Gasto';

  for (const row of rows.slice(2)) {
    if (!row.length) continue;
    const label = row[0];
    const labelLow = label.toLowerCase().trim();

    // Cambio de sección
    if (SECTION_MAP[labelLow]) {
      currentTipo = SECTION_MAP[labelLow];
      continue;
    }

    // Saltear filas que no son transacciones
    if (!labelLow || SKIP_PATTERNS.some(p => p.test(labelLow))) continue;

    // Determinar tipo
    let tipo = currentTipo;
    if (AHORRO_KEYWORDS.some(k => labelLow.includes(k))) {
      tipo = 'Ahorro';
    }

    // Extraer montos de cada columna de fecha
    for (const [colStr, date] of Object.entries(dateCols)) {
      const col = parseInt(colStr);
      if (col >= row.length) continue;
      const amount = parseAmount(row[col]);
      if (!amount) continue;

      let raw;
      if (tipo === 'Ingreso') raw = `cobré $${amount} por ${label}`;
      else if (tipo === 'Ahorro') raw = `deposité $${amount} en ${label}`;
      else raw = `pagué $${amount} de ${label}`;

      transactions.push({ raw, tipo, fecha: date });
    }
  }

  // Ordenar por fecha
  transactions.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const lines = ['﻿raw,tipo,fecha'];
  for (const t of transactions) {
    lines.push(`${t.raw},${t.tipo},${t.fecha}`);
  }

  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
  console.log(`✓ ${outputFile}  →  ${transactions.length} transacciones`);
}

const args = process.argv.slice(2);
if (args.length > 0) {
  args.forEach(convert);
} else {
  const files = fs.readdirSync('.').filter(
    f => f.toLowerCase().endsWith('.csv') && !f.includes('_import')
  );
  if (files.length === 0) {
    console.log('No se encontraron archivos CSV.');
    console.log('Uso: node convertir-csv.js "nombre del archivo.csv"');
  } else {
    files.forEach(convert);
  }
}
