# TALOS Systems

[![CI](https://github.com/Artem1981777/talos-systems/actions/workflows/ci.yml/badge.svg)](https://github.com/Artem1981777/talos-systems/actions/workflows/ci.yml)
[![Deploy Health](https://github.com/Artem1981777/talos-systems/actions/workflows/deploy-check.yml/badge.svg)](https://github.com/Artem1981777/talos-systems/actions/workflows/deploy-check.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-95.6%25-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Mantle Network](https://img.shields.io/badge/Mantle-Sepolia-000000?logo=ethereum)](https://explorer.sepolia.mantle.xyz/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Live:** [https://talos-systems--gromovartem722.replit.app/](https://talos-systems--gromovartem722.replit.app/)

> Autonomous AI agent for mETH vault protection on Mantle Network
> Built for **The Turing Test Hackathon 2026** — Phase 2: AI Awakening ($100k prize pool)

---

## What is TALOS?

TALOS (Tactical Autonomous Liquidation Operations System) is an AI-powered DeFi agent that autonomously monitors and protects a mETH vault on Mantle Network. It uses real **GPT-5 chain-of-thought reasoning** grounded in live on-chain data to make yield optimization and risk management decisions — without any human intervention.

The agent runs a continuous LangGraph-style state machine:

```
OBSERVE → ANALYZE → DECIDE → EXECUTE → REFLECT
```

Each cycle pulls live Mantle Sepolia RPC data, evaluates health factor risk, runs AI reasoning, and persists its decision log on-chain.

---

## Live Infrastructure

| Service | URL / Address |
|---|---|
| Frontend (Production) | [talos-systems--gromovartem722.replit.app](https://talos-systems--gromovartem722.replit.app/) |
| Network | Mantle Sepolia Testnet |
| mETH Vault Contract | [`0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7`](https://explorer.sepolia.mantle.xyz/address/0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7) |
| RPC Endpoint | `https://rpc.sepolia.mantle.xyz` |
| Agent Identity | ERC-8004 Token ID `#0x001` |

---

## Key Features

| Feature | Description |
|---|---|
| **Real AI Reasoning** | GPT-5 generates full OBSERVATION → RISK_ASSESSMENT → THOUGHT → ACTION CoT grounded in live vault data |
| **LangGraph State Machine** | Animated 5-node autonomous workflow visualization |
| **Live On-Chain Data** | Real mETH vault position, live ETH price, Health Factor from Mantle Sepolia RPC |
| **Auto-Cycle Agent** | Triggers AI reasoning every 120s autonomously when activated |
| **ERC-8004 Identity** | On-chain agent identity standard with reputation system and achievement badges |
| **Protocol Intelligence** | APY comparison + Risk Radar across Mantle DeFi (Fluxion, Merchant Moe, Agni Finance, Ondo USDY) |
| **Cyberpunk UI** | Scanline/CRT overlay, matrix rain, glitch text, Framer Motion page transitions |
| **Decision Persistence** | Full reasoning log stored in PostgreSQL with chain-of-thought + confidence score |

---

## Tech Stack

```
Frontend:   React 18 + Vite 7 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + Recharts
Backend:    Express 5 + TypeScript + Drizzle ORM + ethers.js v6
AI:         OpenAI GPT-5 (via Replit AI Integrations proxy)
Database:   PostgreSQL (Replit-managed)
Chain:      Mantle Sepolia — RPC + ethers.js + mETH ERC-20 contract
Infra:      Replit Autoscale Deployment + pnpm v10 workspace
CI/CD:      GitHub Actions (typecheck, build, deploy health check)
```

---

## Architecture

```
talos-systems/
├── artifacts/
│   ├── talos/              # React + Vite frontend (cyberpunk dashboard)
│   │   └── src/
│   │       ├── pages/      # Dashboard, Decisions, Identity, Protocols
│   │       └── components/ # Layout, charts, state machine viz
│   └── api-server/         # Express backend
│       └── src/
│           ├── routes/     # agent, vault, decisions, health, protocols
│           └── lib/        # chain.ts (Mantle RPC), openai client
├── lib/
│   ├── db/                 # Drizzle ORM schema (agent_state, decisions)
│   ├── api-spec/           # OpenAPI 3.1 spec
│   ├── api-client-react/   # React Query hooks (generated)
│   └── api-zod/            # Zod schemas (generated)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # Typecheck + build on every push/PR
│   │   └── deploy-check.yml # Production health check every 6h
│   ├── CONTRIBUTING.md
│   └── ISSUE_TEMPLATE/
└── replit.md               # Agent memory / architecture docs
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL (or use Replit's built-in DB)

### Local Development

```bash
# Clone
git clone https://github.com/Artem1981777/talos-systems.git
cd talos-systems

# Install
pnpm install

# Set environment variables
cp .env.example .env
# Fill in DATABASE_URL, AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY

# Push DB schema
pnpm --filter @workspace/db run push

# Run services (in separate terminals)
pnpm --filter @workspace/api-server run dev   # http://localhost:8080
pnpm --filter @workspace/talos run dev        # http://localhost:22420
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible API base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API key for GPT-5 access |
| `PORT` | Auto-assigned per service |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agent/status` | Current agent state |
| `PATCH` | `/api/agent/status` | Start / pause / change mode |
| `POST` | `/api/agent/think` | Trigger GPT-5 reasoning cycle |
| `POST` | `/api/agent/sync` | Pull on-chain Transfer events |
| `GET` | `/api/agent/stream` | SSE real-time event stream |
| `GET` | `/api/vault/stats` | Live vault metrics (HF, price, LTV) |
| `GET` | `/api/decisions` | Paginated decision history |
| `GET` | `/api/decisions/summary` | Aggregate stats |
| `GET` | `/api/protocols` | Mantle DeFi protocol APY data |
| `GET` | `/api/healthz` | Service health check |

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for commit conventions, branch strategy, and development guide.

---

## Hackathon

| | |
|---|---|
| **Event** | The Turing Test Hackathon 2026 |
| **Organizer** | Mantle Network |
| **Prize Pool** | $100,000 |
| **Category** | Phase 2 — AI Awakening |
| **Goal** | Top-3 finish |

---

*Built on [Replit](https://replit.com) · Powered by [Mantle Network](https://mantle.xyz)*
