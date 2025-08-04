# ChatGPT Micro-Cap Experiment
Welcome to the repo behind my 6-month live trading experiment where ChatGPT manages a real-money micro-cap portfolio.

# The Concept
Everyday, I kept seeing the same ad about having an some A.I. pick undervalued stocks. It was obvious it was trying to get me to subscribe to some garbage, so I just rolled my eyes. 
Then I started wondering, "How well would that actually work?".

So, starting with just $100, I wanted to answer a simple but powerful question:

**Can powerful large language models like ChatGPT actually generate alpha (or at least make smart trading decisions) using real-time data?**

## Each trading day:

- I provide it trading data on the stocks in it's portfolio.

- Strict stop-loss rules apply.

- Everyweek I allow it to use deep research to reevaluate it's account.

- I track and publish performance data weekly on my blog. [SubStack Link](https://nathanbsmith729.substack.com)

  ## Research & Documentation

- [Research Index](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/blob/main/Experiment%20Details/Deep%20Research%20Index.md)

- [Disclaimer](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/blob/main/Experiment%20Details/Disclaimer.md)

- [Q&A](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/blob/main/Experiment%20Details/Q%26A.md)

- [Prompts](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/blob/main/Experiment%20Details/Prompts.md)

- [Starting Your Own](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/blob/main/Start%20Your%20Own/README.md)

-  [Markdown Research Summaries (MD)](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/tree/main/Weekly%20Deep%20Research%20(MD))
- [Weekly Deep Research Reports (PDF)](https://github.com/LuckyOne7777/ChatGPT-Micro-Cap-Experiment/tree/main/Weekly%20Deep%20Research%20(PDF))
  
# Performance Example (6/30 – 7/25)

---

![Week 4 Performance](%286-30%20-%207-25%29%20Results.png)

---
- Currently stomping on the Russell 2K.

# Features of This Repo
Live trading scripts — Used to evaluate prices and update holdings daily

LLM-powered decision engine — ChatGPT picks the trades

Performance tracking — CSVs with daily PnL, total equity, and trade history

Visualization tools — Matplotlib graphs comparing ChatGPT vs Index

Logs & trade data — Auto-saved logs for transparency

# Why This Matters
AI is being hyped across every industry, but can it really manage money without guidance?

This project is an attempt to find out, with transparency, data, and a real budget.

# Tech Stack
Basic Python 

Pandas + yFinance for data & logic

Matplotlib for visualizations

ChatGPT for decision-making

# Follow Along
The experiment runs June 2025 to December 2025.
Every trading day I will update the portfolio CSV file.
If you feel inspired to do something simiar, feel free to use this as a blueprint.

Updates are posted weekly on my blog — more coming soon!

One final shameless plug: (https://substack.com/@nathanbsmith?utm_source=edit-profile-page)

Find a mistake in the logs or have advice?
Please Reach out here: nathanbsmith.business@gmail.com

## Automation & Deployment

### Non-interactive Mode

Run the daily portfolio update without any prompts by passing `--no-interactive`:

```bash
node index.js --no-interactive
```

Use `--data` or the `DATA_DIR` environment variable to choose where CSV files are stored:

```bash
DATA_DIR=/path/to/data node index.js --no-interactive
```

### Scheduling

#### Using cron

Schedule the script on a Linux server with `crontab -e`:

```
0 20 * * 1-5 /usr/bin/node /opt/app/index.js --no-interactive >> /var/log/portfolio.log 2>&1
```

This example runs at 8 PM Monday–Friday.

#### Using node-cron

Add [node-cron](https://www.npmjs.com/package/node-cron) and create a small wrapper:

```js
const cron = require('node-cron');
const { main } = require('./index');

cron.schedule('0 20 * * 1-5', () => main(['--no-interactive']));
```

### Environment Variables

Configuration can be supplied via environment variables:

- `DATA_DIR` – directory for CSV data (defaults to `Scripts and CSV Files`).
- `API_KEY` – placeholder for any future data-provider keys.

Set them in your shell or via a `.env` file:

```bash
export DATA_DIR=/data/chatgpt
export API_KEY=your-key-here
```

### Containerization

A minimal `Dockerfile` is included for deployment on a VPS or PaaS.

Build and run the image:

```bash
docker build -t micro-cap .
docker run -e DATA_DIR=/data -v $(pwd)/data:/data micro-cap
```

Use the platform's scheduler (e.g., cron, Kubernetes CronJob, PaaS tasks) to trigger the container at your desired interval.
