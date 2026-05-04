# TALOS Systems

**Live:** [https://talos-systems--gromovartem722.replit.app/](https://talos-systems--gromovartem722.replit.app/)

> Autonomous AI agent for mETH vault protection on Mantle Network  
> Built for **The Turing Test Hackathon 2026** — Phase 2: AI Awakening

---

## What is TALOS?

TALOS (Tactical Autonomous Liquidation Operations System) is an AI-powered DeFi agent that autonomously monitors and protects a mETH vault on Mantle Network. It uses real GPT-5 chain-of-thought reasoning grounded in live on-chain data to make yield optimization and risk management decisions.

## Live Infrastructure

| Service | URL |
|---|---|
| Frontend (Production) | [talos-systems--gromovartem722.replit.app](https://talos-systems--gromovartem722.replit.app/) |
| Network | Mantle Sepolia Testnet |
| Contract | [`0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7`](https://explorer.sepolia.mantle.xyz/address/0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7) |
| RPC | `https://rpc.sepolia.mantle.xyz` |

## Features

- **Real AI Reasoning** — GPT-5 generates full OBSERVATION → RISK_ASSESSMENT → THOUGHT → ACTION chain-of-thought grounded in live vault data
- **LangGraph State Machine** — Animated 5-node workflow: OBSERVE → ANALYZE → DECIDE → EXECUTE → REFLECT
- **Live On-Chain Data** — Real mETH vault position, live ETH price, Health Factor from Mantle Sepolia RPC
- **Auto-Cycle Agent** — Triggers reasoning every 120s autonomously when activated
- **ERC-8004 Identity** — On-chain agent identity standard with reputation system and achievement badges
- **Protocol Intelligence** — APY comparison + Risk Radar across Mantle DeFi (Fluxion, Merchant Moe, Agni Finance, Ondo USDY)
- **Cyberpunk UI** — Scanline/CRT overlay, matrix rain, glitch text, Framer Motion transitions

## Tech Stack

```
Frontend:   React + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion + Recharts
Backend:    Express + TypeScript + Drizzle ORM + ethers.js
AI:         OpenAI GPT-5 (via Replit AI Integrations)
Database:   PostgreSQL
Chain:      Mantle Sepolia (RPC + ethers.js)
Infra:      Replit Autoscale Deployment + pnpm monorepo
```

## Architecture

```
artifacts/
  talos/          → React + Vite frontend (cyberpunk dashboard)
  api-server/     → Express backend (AI reasoning, chain data, DB)
lib/
  db/             → Drizzle ORM schema (agent_state, decisions)
  api-spec/       → OpenAPI spec
  api-client-react/ → React Query hooks (generated)
```

## Hackathon

- **Event:** The Turing Test Hackathon 2026 — Mantle Network
- **Prize Pool:** $100,000
- **Category:** Phase 2 — AI Awakening
- **Goal:** Top-3 finish

---

*Built on [Replit](https://replit.com) · Powered by Mantle Network*
