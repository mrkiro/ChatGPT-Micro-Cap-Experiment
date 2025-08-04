const path = require('path');
const processPortfolio = require('./processPortfolio');
const dailyResults = require('./dailyResults');
const { setDataDir, loadPortfolio } = require('./data/csvStore');
const { main: manualMain, setDataDir: setManualDir } = require('./cli/manualTrades');

async function loadCurrentPortfolio(dataDir) {
  setDataDir(dataDir);
  const rows = await loadPortfolio();
  if (!rows.length) return { holdings: [], cash: 0 };
  const dates = [...new Set(rows.map(r => r.Date))].sort();
  const latest = dates[dates.length - 1];
  const holdingsRows = rows.filter(r => r.Date === latest && r.Ticker !== 'TOTAL');
  const totalRow = rows.find(r => r.Date === latest && r.Ticker === 'TOTAL') || {};
  const holdings = holdingsRows.map(r => ({
    ticker: r.Ticker,
    shares: Number(r.Shares),
    buy_price: Number(r['Cost Basis']),
    stop_loss: Number(r['Stop Loss'])
  }));
  const cash = Number(totalRow['Cash Balance'] || 0);
  return { holdings, cash };
}

async function runPortfolio(startingCash, dataDir, opts = {}) {
  const { interactive = true } = opts;
  const { holdings, cash } = await loadCurrentPortfolio(dataDir);
  const initialCash = typeof startingCash === 'number' ? startingCash : cash;
  const result = await processPortfolio(holdings, initialCash, dataDir, { interactive });
  await dailyResults(dataDir);
  return result;
}

async function runManual(dataDir) {
  if (setManualDir) setManualDir(dataDir);
  await manualMain();
}

function parseArgs(argv) {
  const opts = { manual: false, interactive: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cash' || a === '-c') {
      opts.cash = parseFloat(argv[++i]);
    } else if (a === '--data' || a === '-d') {
      opts.dataDir = argv[++i];
    } else if (a === '--manual' || a === '-m') {
      opts.manual = true;
    } else if (a === '--no-interactive' || a === '-n') {
      opts.interactive = false;
    }
  }
  return opts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataDir = args.dataDir || process.env.DATA_DIR || path.join(__dirname, 'Scripts and CSV Files');
  if (args.manual) {
    await runManual(dataDir);
  } else {
    await runPortfolio(args.cash, dataDir, { interactive: args.interactive });
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, runPortfolio, runManual, loadCurrentPortfolio };
