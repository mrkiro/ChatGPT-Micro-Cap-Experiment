const path = require('path');
const yahooFinance = require('yahoo-finance2').default;
const { setDataDir, loadPortfolio } = require('./data/csvStore');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function fetchTwoDay(ticker) {
  try {
    const hist = await yahooFinance.historical(ticker, {
      period1: daysAgo(10),
      interval: '1d',
    });
    const lastTwo = hist.slice(-2);
    if (lastTwo.length < 2) return { ticker, error: 'Not enough data' };
    const [prev, curr] = lastTwo;
    const change = ((curr.close - prev.close) / prev.close) * 100;
    return {
      ticker,
      price: curr.close,
      change,
      volume: curr.volume,
    };
  } catch (err) {
    return { ticker, error: err.message };
  }
}

function calculateStats(series) {
  if (series.length < 2) return { returns: [], sharpe: 0, sortino: 0 };
  const returns = [];
  for (let i = 1; i < series.length; i++) {
    const r = (series[i] - series[i - 1]) / series[i - 1];
    returns.push(r);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  const downside = returns.filter(r => r < 0);
  const dVariance = downside.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (downside.length || 1);
  const dStd = Math.sqrt(dVariance);
  const sharpe = std === 0 ? 0 : (mean / std) * Math.sqrt(252);
  const sortino = dStd === 0 ? 0 : (mean / dStd) * Math.sqrt(252);
  return { returns, sharpe, sortino };
}

async function equivalentSpx(start, end) {
  try {
    const hist = await yahooFinance.historical('^SPX', {
      period1: new Date(start),
      period2: new Date(end),
      interval: '1d',
    });
    if (hist.length === 0) return null;
    const first = hist[0].close;
    const last = hist[hist.length - 1].close;
    return 100 * (last / first);
  } catch {
    return null;
  }
}

async function main(dataDir = path.join(__dirname, 'Scripts and CSV Files')) {
  setDataDir(dataDir);
  const rows = await loadPortfolio();
  if (!rows.length) {
    console.log('No portfolio data found');
    return;
  }
  const dates = [...new Set(rows.map(r => r.Date))].sort();
  const latest = dates[dates.length - 1];
  const current = rows.filter(r => r.Date === latest && r.Ticker !== 'TOTAL');
  const tickers = new Set(current.map(r => r.Ticker));
  ['^RUT', 'IWO', 'XBI', '^SPX'].forEach(t => tickers.add(t));

  const pricePromises = [];
  for (const t of tickers) pricePromises.push(fetchTwoDay(t));
  const priceData = await Promise.all(pricePromises);

  const equityRows = rows.filter(r => r.Ticker === 'TOTAL').sort((a, b) => a.Date.localeCompare(b.Date));
  const equitySeries = equityRows.map(r => Number(r['Total Equity']));
  const { sharpe, sortino } = calculateStats(equitySeries);
  const startDate = equityRows[0].Date;
  const endDate = equityRows[equityRows.length - 1].Date;
  const spx100 = await equivalentSpx(startDate, endDate);

  const output = {
    prices: priceData,
    metrics: {
      latestEquity: equitySeries[equitySeries.length - 1],
      sharpe,
      sortino,
      spx100,
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  const dir = process.argv[2];
  main(dir).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = main;
