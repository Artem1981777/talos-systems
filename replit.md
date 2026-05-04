# TALOS Systems — AI Agent for Mantle Network

**Hackathon:** The Turing Test Hackathon 2026 — Mantle Network, Phase 2: AI Awakening ($100k prize pool)

## Architecture

Monorepo (pnpm workspaces):

```
artifacts/
  talos/          → React + Vite frontend (cyberpunk dashboard)
  api-server/     → Express + TypeScript backend
lib/
  db/             → Drizzle ORM + PostgreSQL schema
  api-spec/       → OpenAPI spec + Orval codegen
  api-zod/        → Zod validation schemas (generated)
  api-client-react/ → React Query hooks (generated)
  integrations-openai-ai-server/ → OpenAI AI integration (GPT-5)
  integrations-openai-ai-react/  → React AI hooks
```

## Key Features

### On-Chain Integration (Mantle Sepolia)
- **RPC:** `https://rpc.sepolia.mantle.xyz` — live block data
- **Contract:** `0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7` (mETH vault)
- **On-chain event sync:** Transfer events → decisions table (idempotent)
- **Live ETH price:** Multi-source (CoinGecko → CryptoCompare → Kraken)
- **Vault position:** Dynamic health factor from real mETH supply + live ETH price

### AI Agent (GPT-5 Powered)
- **Model:** GPT-5.2 via Replit AI Integrations
- **Reasoning:** Full chain-of-thought: OBSERVATION → RISK_ASSESSMENT → THOUGHT → ACTION
- **LangGraph State Machine UI:** OBSERVE → ANALYZE → DECIDE → EXECUTE → REFLECT
- **Auto-cycle:** Triggers every 120s when agent is ACTIVE
- **Decision persistence:** All reasoning stored in PostgreSQL with txHash links

### ERC-8004 Agent Identity
- Token ID: 0x001
- Reputation score system (0-1000)
- Achievement badges (Genesis Agent, On-Chain Verified, etc.)
- Live contract links to Mantle Sepolia Explorer

### UI/UX
- Cyberpunk dark terminal aesthetic (JetBrains Mono)
- Scanline + CRT vignette overlay
- Matrix rain sidebar animation
- Framer Motion page transitions
- Health factor time-series chart (live accumulation)
- Risk Radar chart (APY vs Safety)
- Auto-cycle countdown timer with circular progress ring
- Real-time SSE stream for on-chain event notifications

## DB Schema

- `agent_state` — singleton agent status (mode, reputation, decisions count, ROI)
- `decisions` — full decision log with chain-of-thought, confidence, txHash, ROI

## API Routes

- `GET /api/agent/status` — agent state
- `PATCH /api/agent/status` — start/pause/change mode
- `GET /api/agent/identity` — ERC-8004 identity
- `POST /api/agent/think` — trigger AI reasoning cycle (GPT-5)
- `POST /api/agent/sync` — pull on-chain Transfer events
- `GET /api/agent/stream` — SSE event stream
- `GET /api/vault/stats` — live vault metrics
- `GET /api/decisions` — paginated decision history
- `GET /api/decisions/summary` — aggregate stats
- `GET /api/protocols` — Mantle DeFi protocol APY data

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (Replit-managed)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI proxy
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI key
- `PORT` — auto-assigned per artifact
- `BASE_PATH` — artifact base URL path
