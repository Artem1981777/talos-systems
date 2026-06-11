# TALOS Systems — Autonomous AI DeFi Agent

> **Tactical Autonomous Liquidation Operations System**
>
> Turing Test Hackathon 2026 — AI x RWA Track

**[🌐 Live Demo](https://talos-systems-talos-awwf.vercel.app)** · **[🆚 Human vs AI Arena](https://talos-systems-talos-awwf.vercel.app/arena)** · **[⚙️ Live API](https://talos-api-wfzx.onrender.com/api/healthz)** · **[🎬 Demo Video](https://youtube.com/shorts/-fU0SNQzJRQ)**

---

## What is TALOS?

TALOS is a fully autonomous AI agent that protects and optimizes a **mETH (Mantle ETH) yield vault**. It reads live on-chain data from **Mantle Sepolia**, reasons about market conditions with a real LLM (Groq Llama-3.3-70b), scores risk with a formal math engine, and proposes allocation decisions — all visible in real time on a cyberpunk dashboard.

- **ERC-8004 agent identity** — NFT `#0x001`, vault contract [`0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7`](https://sepolia.mantlescan.xyz/address/0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7) on Mantle Sepolia
- **Real AI reasoning** — structured OBSERVATION → RISK_ASSESSMENT → THOUGHT → ACTION output, live in the dashboard
- **Human vs AI oversight mode** — approve/reject every AI trade and compare ROI ([/arena](https://talos-systems-talos-awwf.vercel.app/arena))

---

## Try It (for judges)

1. Open the **[Live Demo](https://talos-systems-talos-awwf.vercel.app)** — vault stats (collateral, debt, health factor) are read live from Mantle Sepolia. *Note: the free-tier API cold-starts in ~50 s after inactivity.*
2. Trigger an **AI analysis** — the agent calls Groq Llama-3.3-70b and returns full reasoning. The shared demo key allows **5 AI requests/day per IP**; bring your own key for unlimited access.
3. Play the **[Human vs AI Arena](https://talos-systems-talos-awwf.vercel.app/arena)** — veto the agent's trades and see whether you beat full autonomy.

### Live API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/healthz` | GET | Service health |
| `/api/vault/stats` | GET | Live vault position from Mantle Sepolia |
| `/api/agent/think` | POST | Real LLM reasoning + allocation decision |
| `/api/agent/status` | GET | Agent identity & state |
| `/api/decisions` | GET | Decision history |
| `/api/protocols` | GET | Available DeFi protocols |

Base URL: `https://talos-api-wfzx.onrender.com`

---

## Architecture

```
┌─────────────────────────────────────────┐
│  FRONTEND (React 19 + Vite · Vercel)    │
│  Cyberpunk UI, real-time dashboard       │
├─────────────────────────────────────────┤
│  API SERVER (Express + TS · Render)     │
│  REST + SSE stream, Drizzle + Postgres   │
│  Groq Llama-3.3-70b reasoning            │
├─────────────────────────────────────────┤
│  AI ENGINE (Python, standalone)          │
│  ├─ Multi-provider LLM manager           │
│  │   OpenAI → Anthropic → Groq → Mock    │
│  ├─ ReAct agent (reasoning + acting)     │
│  ├─ Risk engine (VaR, Kelly, Sharpe)     │
│  └─ Memory (diskcache + JSON)            │
├─────────────────────────────────────────┤
│  BLOCKCHAIN (Mantle Sepolia)             │
│  ├─ ERC-8004 identity NFT (live mint)    │
│  ├─ Allora oracle + reputation           │
│  └─ mETH vault monitoring (live reads)   │
└─────────────────────────────────────────┘
```

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite, TypeScript, Tailwind v4, Framer Motion, wouter |
| Backend | Express 5, TypeScript, Drizzle ORM, PostgreSQL |
| AI | Groq Llama-3.3-70b (live), Python multi-provider engine (ReAct) |
| Risk | Custom VaR, Kelly Criterion, Sharpe Ratio |
| Blockchain | Mantle Sepolia, ethers.js v6, Solidity 0.8.24 |
| Infra | Vercel (frontend), Render (API + Postgres) |

---

## Quick Start (local)

```bash
git clone https://github.com/Artem1981777/talos-systems.git
cd talos-systems

# Full web stack (Node 20+, pnpm)
pnpm install
PORT=3000 pnpm --filter @workspace/api-server dev   # API on :3000
pnpm --filter @workspace/talos dev                   # frontend (Vite)

# Python AI engine — works with zero API keys (Mock LLM)
pip install -r requirements.txt
export USE_MOCK_LLM=true USE_MOCK_ALLORA=true
PYTHONPATH=$(pwd) python3 src/main.py

# ...or with real providers
export GROQ_API_KEY=gsk_...        # and/or OPENAI_API_KEY / ANTHROPIC_API_KEY
PYTHONPATH=$(pwd) python3 src/main.py
```

Environment for the deployed API (`render.yaml`): `DATABASE_URL` (Postgres), `GROQ_API_KEY` (AI reasoning).

---

## AI Engine

### LLM reasoning (live, on the API)
- **Groq Llama-3.3-70b** generates structured decisions: OBSERVATION → RISK_ASSESSMENT → THOUGHT → NEXT_ACTION → ACTION + confidence
- **Shared-pool protection**: 5 requests/day per IP on the demo key; `x-anthropic-key` header for BYOK; demo fallback mode for offline judging

### Python engine (standalone)
- **Multi-provider with circuit breaker**: OpenAI GPT-4o → Anthropic Claude 3.5 → Groq → Mock LLM (no keys needed)
- **ReAct pattern**: OBSERVE → ANALYZE → DECIDE → PLAN → EXECUTE with tool calling (`get_vault_state`, `get_market_data`, `calculate_risk_metrics`), max 5 iterations, conservative fallback
- **Risk engine**: VaR (95% CI), Kelly Criterion position sizing, Sharpe Ratio, liquidation-probability model
- **Memory**: diskcache short-term (7-day TTL) + JSON long-term (importance > 0.7) with auto-consolidation
- **Telegram alerts**: cycle reports, health-factor warnings (HF < 1.5 critical, < 1.2 emergency) — see `src/utils/telegram_alerts.py`

---

## 🆚 Human vs AI — Oversight Mode

> **Live:** https://talos-systems-talos-awwf.vercel.app/arena

TALOS proposes trade decisions one by one — **you approve or reject each call** — and two portfolios are tracked side by side from a $1,000 start:

- **AI Autonomous** — executes *every* decision TALOS makes (compounding)
- **Human-Supervised** — executes *only* the trades you approve
- **Verdict + scorecard** — final ROI showdown, `GOOD_VETOES` (losing trades you blocked) vs `BAD_VETOES` (winners you rejected), full per-round breakdown, replayable

Instead of asking *"should you trust the agent?"*, the arena **quantifies** the value a human overseer adds (or destroys) as a measurable ROI delta.

---

## 🌐 Allora Network Integration

Decentralized AI inference and reputation via a **live Allora consumer-API oracle** (real ETH price feed, topic 1), with mock fallback for keyless demos:

- Consensus scoring for agent decisions, on-chain reputation in the ERC-8004 identity
- Reputation tiers: NOVICE → INTERMEDIATE → ADVANCED → EXPERT → LEGENDARY (0 → 9000+)

```bash
export ALLORA_API_KEY=your_key   # or USE_MOCK_ALLORA=true
export ALLORA_TOPIC_ID=1
```

---

## 🏆 Hackathon Criteria Alignment

| Criteria | TALOS Implementation |
|----------|---------------------|
| **ERC-8004 Agent Identity** | Live identity NFT minted on Mantle Sepolia |
| **AI Reasoning** | Live Groq LLM on the API + ReAct engine with tool calling |
| **On-chain Benchmarking** | Allora Network oracle + reputation |
| **Risk Management** | Formal VaR / Kelly / Sharpe engine |
| **Human vs AI** | Live oversight arena with ROI showdown ([/arena](https://talos-systems-talos-awwf.vercel.app/arena)) |
| **mETH Vault Management** | Live Mantle Sepolia vault reads |

---

## Project Status

- ✅ Live frontend (Vercel) + API (Render) + PostgreSQL
- ✅ Real LLM reasoning on the deployed API (Groq)
- ✅ Live on-chain vault reads (Mantle Sepolia)
- ✅ ERC-8004 agent identity NFT
- ✅ Allora consumer-API oracle (live ETH inference)
- ✅ Human vs AI oversight arena
- ✅ Risk engine (VaR, Kelly, Sharpe) + agent memory
- ✅ Telegram alerts
- 🔄 GuardianModule on-chain risk guard (in progress)
- 🔄 Flash-loan arbitrage, cross-protocol rebalancing, strategy NFTs (planned)

---

## License & Team

MIT License — see [LICENSE](LICENSE).

Built by [Artem1981777](https://github.com/Artem1981777) for Turing Test Hackathon 2026 — AI x RWA Track.
