# Prometheus

**Autonomous AI Venture Capitalist on Monad**

Prometheus discovers, evaluates, and invests in tokens on the Monad blockchain via [nad.fun](https://nad.fun). It operates as a fully autonomous agent — scanning for new token launches, scoring them across on-chain metrics, making investment decisions, and using earned fees to fuel further investments in a self-sustaining cycle.

Every decision is logged. Every trade is transparent. Full autonomy, full accountability.

---

## Architecture

Monorepo with two workspaces:

```
prometheus/
├── app/          # Next.js 16 dashboard (Vercel)
├── backend/      # Express API + Prisma + PostgreSQL (Railway)
├── package.json  # npm workspaces root
└── tsconfig.base.json
```

### Backend (`backend/`)

Express server that powers the bot's brain and serves the API.

| Directory | Purpose |
|-----------|---------|
| `src/scanner/` | Scans nad.fun every 30s for new token launches |
| `src/services/` | Core logic — bot actions, portfolio, token evaluation, activity stats |
| `src/routes/` | REST API endpoints (portfolio, tokens, activity, bot, analytics, transactions) |
| `src/jobs/` | Scheduled tasks (price snapshots, portfolio snapshots) |
| `src/middleware/` | Bot API authentication |
| `src/config/` | Database connection (Prisma) |
| `prisma/` | Schema + migrations |

**Key APIs:**
- `GET /api/portfolio/overview` — Total value, P&L, win rate, active positions
- `GET /api/portfolio/holdings` — Current holdings with unrealized P&L
- `GET /api/tokens` — All discovered tokens with filtering
- `GET /api/activity` — Paginated decision log with token data
- `GET /api/activity/stats` — Aggregated stats (action counts, avg confidence, current sentiment)
- `GET /api/activity/live` — SSE stream of real-time bot actions
- `POST /api/bot/action` — Log a bot action (authenticated)
- `POST /api/bot/thought` — Stream agent thoughts in real-time (authenticated)
- `GET /api/analytics/*` — Win rate, ROI by token, volume history
- `POST /api/pitch` — Create a pitch (tokenAddress + message); returns pitch + initial AI reply
- `POST /api/pitch/:id/message` — Send a message in a pitch; after 3 user messages, AI returns verdict
- `GET /api/pitch` — Paginated pitch feed (optional status, verdict filters)
- `GET /api/pitch/:id` — Single pitch with full message history

### Frontend (`app/`)

Next.js 16 dashboard with a dark, fire/ember aesthetic.

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Two-column hero with live agent terminal, sentiment gauge, investment cycle pipeline, holdings grid, recent trades, performance chart |
| Portfolio | `/portfolio` | Full portfolio overview with holdings table and P&L tracking |
| Decisions | `/decisions` | Card-based decision log with expandable details — reasoning, sentiment, confidence bars, evaluation factor breakdowns, transaction links |
| Tokens | `/tokens` | All discovered tokens with filtering by market type and search |
| Token Detail | `/tokens/[address]` | Individual token page with price history, transactions, and bot actions |
| Analytics | `/analytics` | Win rate, ROI by token, and volume charts |

**Design system:** Tailwind CSS 4, Radix UI, Lucide icons. Custom fonts (Cinzel, Cormorant Garamond, Inter, JetBrains Mono). Dark obsidian base with torch-gold, ember, and flame accents.

---

## How It Works

Prometheus operates on a 5-stage investment cycle:

```
SCAN → EVALUATE → DECIDE → MONITOR → EXIT
 │        │          │         │        │
 │        │          │         │        └─ Sell when exit signals trigger
 │        │          │         └─ Track holdings, watch for signals
 │        │          └─ BUY if score > threshold, SKIP otherwise
 │        └─ Score on 5 factors (age, mcap, volume, holders, creator)
 └─ Discover new tokens on nad.fun every 30s
```

**Token Evaluation** scores each token 0–100 across weighted factors:
- **Age** (0.15) — Time since launch
- **Market Cap** (0.25) — Current valuation
- **Volume** (0.20) — 24h trading volume
- **Holder Count** (0.25) — Number of unique holders
- **Creator History** (0.15) — Creator's track record

Tokens scoring above threshold get a `BUY` recommendation. The agent executes trades, monitors positions, and exits based on predefined signals.

**Self-sustaining model:** Profits and fees earned from successful investments are recycled to seed new positions, creating a compounding investment cycle.

---

## Data Model

Core entities managed by Prisma + PostgreSQL:

- **Token** — Discovered tokens with on-chain metrics, score, market type (CURVE/DEX)
- **Holding** — Active positions with avg buy price, total invested, realized P&L
- **Transaction** — All BUY/SELL trades with amounts, prices, gas costs
- **BotAction** — Every decision the agent makes (SCAN, EVALUATE, BUY, SELL, SKIP, THINK, ERROR) with reasoning, sentiment, confidence, and phase
- **PortfolioSnapshot** — Periodic portfolio value snapshots for charting
- **PriceSnapshot** — Token price history for trend analysis
- **Pitch** — User pitch sessions (token address, status ACTIVE/COMPLETED, verdict, confidence, watchlisted)
- **PitchMessage** — Chat messages in a pitch (user/assistant, content); supports multi-turn conversation and AI verdict

---

## Agent Intelligence

The dashboard surfaces the agent's inner state:

- **Live Terminal** — Real-time SSE stream of the agent's thoughts, scans, evaluations, and trades rendered in a terminal UI
- **Sentiment Gauge** — SVG gauge showing current agent sentiment (BULLISH / NEUTRAL / CAUTIOUS / BEARISH) derived from recent actions
- **Investment Cycle** — Visual 5-stage pipeline showing which phase is active and action counts per stage
- **Decision Cards** — Expandable cards with full reasoning text, confidence bars, evaluation factor breakdowns, and transaction links

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Supabase](https://supabase.com) / [Railway](https://railway.app) free tier)

### Setup

```bash
# Clone and install
git clone <repo-url> && cd prometheus
npm install

# Configure environment
cp .env.example .env
cp .env.example backend/.env
# Edit both .env files with your database URL and API keys

# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### Development

```bash
# Terminal 1 — Backend (port 4000)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:app
```

### Production Build

```bash
npm run build
```

### Deploy

- **Backend** → [Railway](https://railway.app) — add PostgreSQL plugin, deploy from repo
- **Frontend** → [Vercel](https://vercel.com) — set `NEXT_PUBLIC_API_URL` to your Railway backend URL

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `BOT_API_KEY` | Backend | Secret key for bot API authentication |
| `NAD_FUN_API_URL` | Backend | nad.fun API endpoint |
| `MONAD_RPC_URL` | Backend | Monad RPC endpoint |
| `MOLTBOT_WALLET_ADDRESS` | Backend | Bot wallet address |
| `PORT` | Backend | Server port (default: 4000) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API URL |
| `NEXT_PUBLIC_EXPLORER_URL` | Frontend | Block explorer URL |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, SWR, Recharts, Lucide |
| Backend | Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Blockchain | Monad (EVM-compatible L1) |
| DEX | nad.fun (Monad's token launchpad) |

---

## License

Private — all rights reserved.
