const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

let DATA_DIR = path.resolve('.');
let PORTFOLIO_CSV = path.join(DATA_DIR, 'chatgpt_portfolio_update.csv');
let TRADE_LOG_CSV = path.join(DATA_DIR, 'chatgpt_trade_log.csv');

function setDataDir(dir) {
  DATA_DIR = path.resolve(dir);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  PORTFOLIO_CSV = path.join(DATA_DIR, 'chatgpt_portfolio_update.csv');
  TRADE_LOG_CSV = path.join(DATA_DIR, 'chatgpt_trade_log.csv');
}

async function loadPortfolio() {
  try {
    const content = await fsp.readFile(PORTFOLIO_CSV, 'utf8');
    return parseCsv(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function savePortfolio(rows) {
  const csv = toCsv(rows);
  await fsp.writeFile(PORTFOLIO_CSV, csv, 'utf8');
}

async function appendTradeLog(row) {
  const exists = await fileExists(TRADE_LOG_CSV);
  const csv = toCsv([row], !exists);
  await fsp.appendFile(TRADE_LOG_CSV, csv, 'utf8');
}

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).filter(line => line).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i];
    });
    return obj;
  });
}

function toCsv(rows, includeHeader = true) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [];
  if (includeHeader) {
    lines.push(headers.join(','));
  }
  rows.forEach(row => {
    const line = headers.map(h => row[h]).join(',');
    lines.push(line);
  });
  return lines.join('\n') + '\n';
}

async function fileExists(fp) {
  try {
    await fsp.access(fp);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  setDataDir,
  loadPortfolio,
  savePortfolio,
  appendTradeLog,
};
