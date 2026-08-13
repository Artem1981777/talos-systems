# TALOS - Autonomous AI Treasury Agent

> **Tactical Autonomous Liquidity & Operations System**
>
> Built for the **SoSoValue Buildathon** - Category: Tools

**[Live Demo](https://talos-systems-talos-awwf.vercel.app)** | **[Human vs AI Arena](https://talos-systems-talos-awwf.vercel.app/arena)** | **[Live API](https://talos-api-wfzx.onrender.com/api/healthz)** | **[Demo Video](https://youtube.com/shorts/-fU0SNQzJRQ)**

---

## One-sentence idea

TALOS is an autonomous AI treasury agent for solo traders that turns **SoSoValue** market data, news and index signals into risk-scored trade decisions (VaR / Kelly / Sharpe) and executes approved trades through the **SoDEX API**, with a human-veto safety layer.

---

## What is TALOS?

Running a portfolio alone is a full-time job: watch prices, read the news, track index rotation, size positions, manage risk. TALOS turns that into a **one-person finance business** - a single autonomous agent that does the watching, reasoning and risk math for you, and only ever acts with your approval.

Every cycle TALOS:

1. **Pulls live market intelligence from SoSoValue** - spot prices, 24h volatility, index snapshots (e.g. `ssiMAG7`) and category news.
2. **Reasons with a real LLM** (OpenAI -> Anthropic -> Groq, automatic fallback) inside a ReAct loop with tool calling.
3. **Scores risk with a formal engine** - Value-at-Risk (95%), Kelly Criterion sizing, Sharpe ratio, liquidation probability.
4. **Proposes a decision** - `HOLD` / `BUY` / `SELL` / `REBALANCE` / `YIELD_OPTIMIZE` with confidence, and routes it through a **human-veto guardian** before anything executes.

**No mock data, no fake LLM.** If no API key is configured, the LLM layer raises an explicit error and TALOS falls back to the **deterministic risk engine computed on real SoSoValue data** - never on synthetic numbers.

---

## Try It (for judges)

1. Open the **[Live Demo](https://talos-systems-talos-awwf.vercel.app)** - the dashboard shows live SoSoValue market data, risk metrics and the agent's latest decision. *Note: the free-tier API cold-starts in ~50 s after inactivity.*
2. Trigger an **AI analysis** - the agent runs a full ReAct reasoning cycle and returns a risk-scored decision with its reasoning trace.
3. Play the **[Human vs AI Arena](https://talos-systems-talos-awwf.vercel.app/arena)** - approve or veto the agent's trades and see whether a human overseer beats full autonomy.

### Live API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/healthz` | GET | Service health |
| `/api/market/snapshot` | GET | Live SoSoValue price + volatility + index snapshot |
| `/api/agent/think` | POST | Real LLM reasoning + risk-scored decision |
| `/api/agent/status` | GET | Agent identity & state |
| `/api/decisions` | GET | Decision history |

Base URL: `https://talos-api-wfzx.onrender.com`

---

## SoSoValue Data Integration

TALOS is built directly on the **SoSoValue OpenAPI** (`https://openapi.sosovalue.com/openapi/v1`). All market intelligence is real:

| Data | SoSoValue endpoint |
|------|--------------------|
| Currency universe & IDs | `/currencies` |
| Spot price, 24h high/low/turnover, market cap | `/currencies/{id}/market-snapshot` |
| Index universe (13 SSI indices) | `/indices` |
| Index price, ROI, YTD | `/indices/{ticker}/market-snapshot` |
| Index constituents | `/indices/{ticker}/constituents` |
| Category news (news / research / institution / KOL) | `/news` |

- **Volatility** is derived from the real snapshot as `(high_24h - low_24h) / price`.
- Client-side **rate limiting** (default 8 req/min) and **disk caching** keep the agent within demo-key limits.
- Missing fields (e.g. some index ROIs return `null`) are surfaced as-is - never faked.

See `src/integrations/sosovalue.py`.

---

## Architecture

    +-------------------------------------------+
    |  FRONTEND (React 19 + Vite - Vercel)      |
    |  Real-time treasury dashboard             |
    +-------------------------------------------+
    |  API SERVER (Express + TS - Render)       |
    |  REST + SSE stream, Drizzle + Postgres    |
    +-------------------------------------------+
    |  AI ENGINE (Python)                       |
    |  |- Multi-provider LLM manager            |
    |  |    OpenAI -> Anthropic -> Groq (real)  |
    |  |- ReAct agent (reasoning + acting)      |
    |  |- Risk engine (VaR, Kelly, Sharpe)      |
    |  \- Memory (diskcache + JSON)             |
    +-------------------------------------------+
    |  DATA (SoSoValue OpenAPI)                 |
    |  |- Prices + 24h volatility               |
    |  |- SSI indices (ssiMAG7, ssiDeFi, ...)   |
    |  \- Category news feed                    |
    +-------------------------------------------+

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite, TypeScript, Tailwind, Framer Motion, wouter |
| Backend | Express 5, TypeScript, Drizzle ORM, PostgreSQL |
| AI | Multi-provider LLM engine (OpenAI / Anthropic / Groq), ReAct + tool calling |
| Risk | Custom VaR, Kelly Criterion, Sharpe Ratio |
| Data | SoSoValue OpenAPI (prices, indices, news) |
| Execution | Off-chain human-veto guardian -> SoDEX Trading API (roadmap) |
| Infra | Vercel (frontend), Render (API + Postgres) |

---

## Quick Start (local)

    git clone https://github.com/Artem1981777/talos-systems.git
    cd talos-systems

    # Full web stack (Node 20+, pnpm)
    pnpm install
    PORT=3000 pnpm --filter @workspace/api-server dev   # API on :3000
    pnpm --filter @workspace/talos dev                  # frontend (Vite)

    # Python AI engine
    pip install -r requirements.txt

    # 1) SoSoValue key is REQUIRED (real market data, no mock fallback)
    export SOSO_API_KEY=your_sosovalue_key
    export SOSO_RATE_PER_MIN=8

    # 2) LLM key is OPTIONAL. With a key you get live reasoning;
    #    without one, TALOS uses the deterministic risk engine on real data.
    export GROQ_API_KEY=gsk_...        # recommended (free) - and/or OPENAI_API_KEY / ANTHROPIC_API_KEY

    # 3) Portfolio + run parameters
    export TALOS_SYMBOL=BTC TALOS_INDEX=ssiMAG7 TALOS_NEWS_CATEGORY=1
    export TALOS_MAX_TRADE_PCT=20 TALOS_MAX_RISK_SCORE=70
    export TALOS_PORTFOLIO='{"BTC": 0.5, "ETH": 4, "USDS": 1000}'

    PYTHONPATH=$(pwd) python3 src/main.py

Environment for the deployed API (`render.yaml`): `DATABASE_URL` (Postgres), `SOSO_API_KEY` (market data), `GROQ_API_KEY` (AI reasoning).

---

## AI Engine

### Multi-provider LLM (real keys only)
- **Priority with circuit breaker**: OpenAI GPT-4o -> Anthropic Claude 3.5 Sonnet -> Groq Llama-3.3-70b, with automatic fallback across providers.
- **No mock LLM.** If no key is set or every provider fails, `generate()` raises `LLMError` and the agent falls back to the deterministic risk engine.

### ReAct agent
- **OBSERVE -> ANALYZE -> DECIDE -> PLAN** loop (max 5 iterations) with tool calling: `get_market_data`, `get_index_data`, `get_crypto_news`, `calculate_risk_metrics`, `get_recent_decisions`.
- Actions: `HOLD` / `BUY` / `SELL` / `REBALANCE` / `EMERGENCY_EXIT`.

### Risk engine
- **VaR (95% CI)**, **Kelly Criterion** position sizing, **Sharpe Ratio**, liquidation-probability model, recommended action (`HOLD` / `REBALANCE` / `EMERGENCY_EXIT` / `YIELD_OPTIMIZE`).

### Memory
- diskcache short-term store + JSON long-term store, decision history feeds back into future reasoning.

---

## Human vs AI - Oversight Mode

> **Live:** https://talos-systems-talos-awwf.vercel.app/arena

TALOS proposes trade decisions one by one - **you approve or reject each call** - and two portfolios are tracked side by side from the same start:

- **AI Autonomous** - executes *every* decision TALOS makes (compounding)
- **Human-Supervised** - executes *only* the trades you approve
- **Verdict + scorecard** - final ROI showdown, `GOOD_VETOES` (losing trades you blocked) vs `BAD_VETOES` (winners you rejected), full per-round breakdown

Instead of asking *"should you trust the agent?"*, the arena **quantifies** the value a human overseer adds (or destroys) as a measurable ROI delta.

---

## Safety - Off-chain Human-Veto Guardian

Before any execution, every decision passes through a deterministic **guardian gate** (`src/execution/guardian_gate.py`) and a **pre-trade simulator** (`src/execution/simulator.py`):

- **Per-trade cap** (`TALOS_MAX_TRADE_PCT`) and **max risk-score gate** (`TALOS_MAX_RISK_SCORE`).
- **Fail-closed**: any error or missing data downgrades the trade to a no-op.
- **Human veto**: no trade executes without explicit approval in the arena.
- Pure and offline-safe, so evaluation and CI stay deterministic.

---

## Buildathon Criteria Alignment

| Criteria (weight) | TALOS Implementation |
|-------------------|----------------------|
| **User Value (30%)** | Turns a full-time solo-trading workload into one autonomous, risk-scored agent with human veto - a one-person finance business |
| **Working Demo (25%)** | Live dashboard + API + arena, end-to-end run green on real SoSoValue data |
| **Logic & Workflow (20%)** | ReAct reasoning loop + formal VaR / Kelly / Sharpe risk engine + guardian gate |
| **Data-API Integration (15%)** | Deep SoSoValue OpenAPI integration: prices, volatility, 13 SSI indices, category news |
| **UX (10%)** | Real-time treasury dashboard + interactive Human-vs-AI oversight arena |

---

## Project Status

- [x] Live frontend (Vercel) + API (Render) + PostgreSQL
- [x] Real SoSoValue OpenAPI integration (prices + indices + news)
- [x] Multi-provider LLM engine (real keys only, no mock) + deterministic risk-engine fallback
- [x] Risk engine (VaR, Kelly, Sharpe) + agent memory
- [x] Human vs AI oversight arena
- [x] Off-chain human-veto guardian + pre-trade simulator
- [x] End-to-end run verified green on live data (`execution_plan` empty, no errors)
- [ ] SoDEX Trading API execution, position sizing within caps, strategy presets (planned)

---

## License & Team

MIT License.

Built by [Artem1981777](https://github.com/Artem1981777) for the **SoSoValue Buildathon**.
