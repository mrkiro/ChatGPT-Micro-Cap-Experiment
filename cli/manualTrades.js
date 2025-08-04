const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

let DATA_DIR = path.join(__dirname, '..', 'Scripts and CSV Files');
let portfolioPath = path.join(DATA_DIR, 'chatgpt_portfolio_update.csv');
let tradeLogPath = path.join(DATA_DIR, 'chatgpt_trade_log.csv');

function setDataDir(dir) {
  DATA_DIR = path.resolve(dir);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  portfolioPath = path.join(DATA_DIR, 'chatgpt_portfolio_update.csv');
  tradeLogPath = path.join(DATA_DIR, 'chatgpt_trade_log.csv');
}

function loadPortfolio() {
  const text = fs.readFileSync(portfolioPath, 'utf8').trim();
  const lines = text.split('\n');
  const header = lines[0];
  const rows = lines.slice(1).map(line => line.split(','));
  let lastTotalIndex = rows.length - 1;
  while (lastTotalIndex >= 0 && rows[lastTotalIndex][1] !== 'TOTAL') lastTotalIndex--;
  const lastDate = rows[lastTotalIndex][0];
  let groupStart = lastTotalIndex;
  while (groupStart > 0 && rows[groupStart - 1][0] === lastDate) groupStart--;
  return { header, rows, lastDate, groupStart, lastTotalIndex };
}

function ensureTodayGroup(data, today) {
  if (data.lastDate === today) return data;
  const oldGroup = data.rows.slice(data.groupStart, data.lastTotalIndex + 1);
  const newGroup = oldGroup.map(r => {
    const copy = [...r];
    copy[0] = today;
    return copy;
  });
  const rows = data.rows.concat(newGroup);
  const groupStart = rows.length - newGroup.length;
  const lastTotalIndex = rows.length - 1;
  return { header: data.header, rows, lastDate: today, groupStart, lastTotalIndex };
}

function recalcTotals(data, cash) {
  const holdings = data.rows.slice(data.groupStart, data.lastTotalIndex);
  let totalValue = 0;
  let totalPnL = 0;
  holdings.forEach(r => {
    totalValue += parseFloat(r[6] || 0);
    totalPnL += parseFloat(r[7] || 0);
  });
  const totalRow = data.rows[data.lastTotalIndex];
  totalRow[6] = totalValue.toFixed(2);
  totalRow[7] = totalPnL.toFixed(2);
  totalRow[9] = cash.toFixed(2);
  totalRow[10] = (cash + totalValue).toFixed(2);
}

function savePortfolio(data) {
  const lines = [data.header, ...data.rows.map(r => r.join(','))];
  fs.writeFileSync(portfolioPath, lines.join('\n') + '\n');
}

async function logManualBuy() {
  const answers = await inquirer.prompt([
    { name: 'ticker', message: 'Ticker:', filter: v => v.toUpperCase(), validate: v => /^[A-Z]+$/.test(v) || 'Ticker required' },
    { name: 'shares', message: 'Shares:', validate: v => { const n = parseFloat(v); return n > 0 || 'Shares must be positive'; } },
    { name: 'price', message: 'Price:', validate: v => { const n = parseFloat(v); return n >= 0 || 'Price must be non-negative'; } },
    { name: 'stop', message: 'Stop loss:', validate: v => { const n = parseFloat(v); return n >= 0 || 'Stop loss must be non-negative'; } },
    { name: 'reason', message: 'Reason:' }
  ]);

  const ticker = answers.ticker.toUpperCase();
  const shares = parseFloat(answers.shares);
  const price = parseFloat(answers.price);
  const stop = parseFloat(answers.stop);
  const reason = answers.reason || '';
  const today = new Date().toISOString().slice(0, 10);

  let data = loadPortfolio();
  data = ensureTodayGroup(data, today);
  const totalRow = data.rows[data.lastTotalIndex];
  let cash = parseFloat(totalRow[9] || 0);
  const cost = shares * price;
  if (cost > cash) {
    console.error('Insufficient cash.');
    return;
  }
  const holdings = data.rows.slice(data.groupStart, data.lastTotalIndex);
  let row = holdings.find(r => r[1] === ticker);
  if (row) {
    const oldShares = parseFloat(row[2]);
    const oldCost = parseFloat(row[3]);
    const newShares = oldShares + shares;
    const newCostBasis = ((oldCost * oldShares) + cost) / newShares;
    row[2] = newShares.toFixed(1);
    row[3] = newCostBasis.toFixed(2);
    row[4] = stop.toFixed(2);
    row[5] = price.toFixed(2);
    row[6] = (newShares * price).toFixed(2);
    row[7] = ((price - newCostBasis) * newShares).toFixed(2);
    row[8] = 'HOLD';
  } else {
    row = [today, ticker, shares.toFixed(1), price.toFixed(2), stop.toFixed(2), price.toFixed(2), (shares * price).toFixed(2), '0.00', 'HOLD', '', ''];
    data.rows.splice(data.lastTotalIndex, 0, row);
    data.lastTotalIndex++;
  }
  cash -= cost;
  recalcTotals(data, cash);
  savePortfolio(data);

  const line = `${today},${ticker},${shares},${price},${cost.toFixed(2)},0.0,${reason},,`;
  fs.appendFileSync(tradeLogPath, line + '\n');
  console.log('Manual buy logged.');
}

async function logManualSell() {
  const answers = await inquirer.prompt([
    { name: 'ticker', message: 'Ticker:', filter: v => v.toUpperCase(), validate: v => /^[A-Z]+$/.test(v) || 'Ticker required' },
    { name: 'shares', message: 'Shares:', validate: v => { const n = parseFloat(v); return n > 0 || 'Shares must be positive'; } },
    { name: 'price', message: 'Price:', validate: v => { const n = parseFloat(v); return n >= 0 || 'Price must be non-negative'; } },
    { name: 'stop', message: 'Stop loss:', validate: v => { const n = parseFloat(v); return n >= 0 || 'Stop loss must be non-negative'; } },
    { name: 'reason', message: 'Reason:' }
  ]);

  const ticker = answers.ticker.toUpperCase();
  const shares = parseFloat(answers.shares);
  const price = parseFloat(answers.price);
  const stop = parseFloat(answers.stop);
  const reason = answers.reason || '';
  const today = new Date().toISOString().slice(0, 10);

  let data = loadPortfolio();
  data = ensureTodayGroup(data, today);
  const holdings = data.rows.slice(data.groupStart, data.lastTotalIndex);
  let row = holdings.find(r => r[1] === ticker);
  if (!row) {
    console.error('Ticker not in portfolio.');
    return;
  }
  const oldShares = parseFloat(row[2]);
  if (shares > oldShares) {
    console.error('Not enough shares to sell.');
    return;
  }
  const avgCost = parseFloat(row[3]);
  const revenue = shares * price;
  const cost = shares * avgCost;
  const pnl = revenue - cost;
  const newShares = oldShares - shares;
  if (newShares > 0) {
    row[2] = newShares.toFixed(1);
    row[4] = stop.toFixed(2);
    row[5] = price.toFixed(2);
    row[6] = (newShares * price).toFixed(2);
    row[7] = ((price - avgCost) * newShares).toFixed(2);
    row[8] = 'HOLD';
  } else {
    const idx = data.rows.indexOf(row);
    data.rows.splice(idx, 1);
    data.lastTotalIndex--;
  }
  const totalRow = data.rows[data.lastTotalIndex];
  let cash = parseFloat(totalRow[9] || 0);
  cash += revenue;
  recalcTotals(data, cash);
  savePortfolio(data);

  const line = `${today},${ticker},,,${cost.toFixed(2)},${pnl.toFixed(2)},${reason},${shares},${price}`;
  fs.appendFileSync(tradeLogPath, line + '\n');
  console.log('Manual sell logged.');
}

async function main() {
  const { action } = await inquirer.prompt([
    { type: 'list', name: 'action', message: 'Action:', choices: ['Buy', 'Sell'] }
  ]);
  if (action === 'Buy') await logManualBuy();
  else await logManualSell();
}

if (require.main === module) {
  main();
}

module.exports = { logManualBuy, logManualSell, main, setDataDir };
