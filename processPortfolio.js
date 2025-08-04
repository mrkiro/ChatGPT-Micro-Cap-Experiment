const path = require('path');
const readline = require('readline');
const yahooFinance = require('yahoo-finance2').default;
const { setDataDir, loadPortfolio, savePortfolio, appendTradeLog } = require('./data/csvStore');

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function processPortfolio(portfolio, startingCash, dataDir = path.join(__dirname, 'Scripts and CSV Files'), opts = {}) {
  const { interactive = true } = opts;
  setDataDir(dataDir);
  const today = new Date().toISOString().slice(0, 10);
  const day = new Date().getDay();

  if (day === 0 || day === 6) {
    if (interactive) {
      const response = await ask(`Today is currently a weekend, so markets were never open.\nThis will cause the program to calculate data from the last day (usually Friday), and save it as today.\nAre you sure you want to do this? To exit, enter 1.`);
      if (response.trim() === '1') throw new Error('Exiting program.');
    }
  }

  const results = [];
  let totalValue = 0;
  let totalPnL = 0;
  let cash = startingCash;
  const remaining = [];

  for (const stock of portfolio) {
    const ticker = stock.ticker;
    const shares = Number(stock.shares);
    const cost = Number(stock.buy_price);
    const stop = Number(stock.stop_loss);
    let price;
    try {
      const quote = await yahooFinance.quote(ticker);
      price = typeof quote.regularMarketPrice === 'number' ? quote.regularMarketPrice : NaN;
    } catch {
      price = NaN;
    }

    if (!price) {
      results.push({
        Date: today,
        Ticker: ticker,
        Shares: shares,
        'Cost Basis': cost,
        'Stop Loss': stop,
        'Current Price': '',
        'Total Value': '',
        PnL: '',
        Action: 'NO DATA',
        'Cash Balance': '',
        'Total Equity': '',
      });
      continue;
    }

    price = Number(price.toFixed(2));
    const value = Number((price * shares).toFixed(2));
    const pnl = Number(((price - cost) * shares).toFixed(2));
    let action = 'HOLD';

    if (price <= stop) {
      action = 'SELL - Stop Loss Triggered';
      cash += value;
      await appendTradeLog({
        Date: today,
        Ticker: ticker,
        'Shares Bought': '',
        'Buy Price': '',
        'Cost Basis': cost,
        PnL: pnl,
        Reason: 'AUTOMATED SELL - STOPLOSS TRIGGERED',
        'Shares Sold': shares,
        'Sell Price': price,
      });
    } else {
      totalValue += value;
      totalPnL += pnl;
      remaining.push(stock);
    }

    results.push({
      Date: today,
      Ticker: ticker,
      Shares: shares,
      'Cost Basis': cost,
      'Stop Loss': stop,
      'Current Price': price,
      'Total Value': value,
      PnL: pnl,
      Action: action,
      'Cash Balance': '',
      'Total Equity': '',
    });
  }

  const totalRow = {
    Date: today,
    Ticker: 'TOTAL',
    Shares: '',
    'Cost Basis': '',
    'Stop Loss': '',
    'Current Price': '',
    'Total Value': totalValue.toFixed(2),
    PnL: totalPnL.toFixed(2),
    Action: '',
    'Cash Balance': cash.toFixed(2),
    'Total Equity': (cash + totalValue).toFixed(2),
  };
  results.push(totalRow);

  let existing = await loadPortfolio();
  existing = existing.filter(r => r.Date !== today);
  await savePortfolio(existing.concat(results));

  return { portfolio: remaining, cash };
}

module.exports = processPortfolio;
