# TALOS Systems 🤖

> Tactical Autonomous Liquidation Operations System

**Live Demo:** https://talos-systems-talos-awwf.vercel.app  
**API:** https://talos-systems.onrender.com  
**Built for:** The Turing Test Hackathon 2026 — AI Awakening ($100k prize pool)  
**Network:** Mantle Sepolia Testnet

---

## What is TALOS?

TALOS is an autonomous AI agent that protects and optimizes a mETH vault on Mantle Network. It uses real LLM chain-of-thought reasoning grounded in live on-chain data to make yield optimization and risk management decisions — without any human intervention.

The agent runs a continuous state machine:

OBSERVE → ANALYZE → DECIDE → EXECUTE → REFLECT

Each cycle pulls live Mantle Sepolia RPC data, evaluates health factor risk, runs AI reasoning via Groq Llama-3.3-70b, and persists its decision log to PostgreSQL.

---

## Key Features

- Autonomous AI Agent — runs every 120s without human input
- Live On-Chain Data — real mETH vault position from Mantle Sepolia RPC
- LangGraph State Machine — animated 5-node workflow visualization
- Multi-Agent Consensus — WATCHER + VALIDATOR + EXECUTOR sub-agents
- Real NFT Minting — ERC-721 agent identity on Mantle Sepolia
- On-Chain Execution — real transactions via MetaMask/OKX Wallet
- ERC-8004 Identity — on-chain agent identity with reputation system
- Decision Persistence — full reasoning log in PostgreSQL
- Cyberpunk UI — scanline overlay, glitch text, Framer Motion animations

---

## Live Infrastructure

| Service | URL |
|---------|-----|
| Frontend | https://talos-systems-talos-awwf.vercel.app |
| API Backend | https://talos-systems.onrender.com |
| Network | Mantle Sepolia Testnet |
| mETH Vault | 0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7 |
| NFT Contract | 0xc94da1ad1116fb6ab4ad7665351c1defec8b2de5 |

---

## Tech Stack

- Frontend: React 18 + Vite + TypeScript + Tailwind + Framer Motion
- Backend: Express + TypeScript + Drizzle ORM
- AI: Groq Llama-3.3-70b
- Database: PostgreSQL (Render)
- Chain: Mantle Sepolia + ethers.js v6
- Infra: Vercel + Render

---

## Hackathon

- Event: The Turing Test Hackathon 2026
- Track: AI x RWA
- Prize Pool: $100,000
- Organizer: Mantle Network
- Deadline: June 15, 2026
Each cycle pulls live Mantle Sepolia RPC data, evaluates health factor risk, runs AI reasoning via Groq Llama-3.3-70b, and persists its decision log to PostgreSQL.

---

## Key Features

- **Autonomous AI Agent** — runs every 120s without human input
- **Live On-Chain Data** — real mETH vault position from Mantle Sepolia RPC
- **LangGraph State Machine** — animated 5-node workflow visualization
- **Multi-Agent Consensus** — WATCHER + VALIDATOR + EXECUTOR sub-agents
- **Real NFT Minting** — ERC-721 agent identity on Mantle Sepolia
- **On-Chain Execution** — real transactions via MetaMask/OKX Wallet
- **ERC-8004 Identity** — on-chain agent identity with reputation system
- **Decision Persistence** — full reasoning log in PostgreSQL
- **Cyberpunk UI** — scanline overlay, glitch text, Framer Motion animations

---

## Live Infrastructure

| Service | URL |
|---------|-----|
| Frontend | https://talos-systems-talos-awwf.vercel.app |
| API Backend | https://talos-systems.onrender.com |
| Network | Mantle Sepolia Testnet |
| mETH Vault | 0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7 |
| NFT Contract | 0xc94da1ad1116fb6ab4ad7665351c1defec8b2de5 |
| RPC | https://rpc.sepolia.mantle.xyz |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agent/status | Current agent state |
| POST | /api/agent/think | Trigger AI reasoning cycle |
| GET | /api/vault/stats | Live vault metrics |
| GET | /api/decisions | Decision history |
| GET | /api/protocols | DeFi protocol APY data |
| POST | /api/nft/prepare-mint | Prepare NFT mint |
| GET | /api/healthz | Health check |

---

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Express + TypeScript + Drizzle ORM
- **AI:** Groq Llama-3.3-70b (free tier)
- **Database:** PostgreSQL (Render)
- **Chain:** Mantle Sepolia — ethers.js v6
- **Infra:** Vercel + Render

---

## Getting Started

```bash
git clone https://github.com/Artem1981777/talos-systems.git
cd talos-systems
pnpm install
cp .env.example .env
# Fill in DATABASE_URL, GROQ_API_KEY
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/talos run dev
# TALOS Systems 🤖

> **Tactical Autonomous Liquidation Operations System**

**An autonomous AI agent that protects and optimizes DeFi vaults using real LLM reasoning on live on-chain data.**

![TALOS Banner](https://github.com/Artem1981777/talos-systems/blob/main/attached_assets/banner.jpg?raw=true)

**Live Demo:** [talos-systems-talos-awwf.vercel.app](https://talos-systems-talos-awwf.vercel.app)  
**API:** [talos-systems.onrender.com](https://talos-systems.onrender.com)  
**Network:** Mantle Sepolia Testnet

---

## What is TALOS?

**TALOS** is a fully autonomous AI agent designed to protect and optimize an **mETH vault** on the Mantle Network.

It operates in a continuous intelligent loop:

**OBSERVE → ANALYZE → DECIDE → EXECUTE → REFLECT**

Every 120 seconds the agent:
- Reads real on-chain data from Mantle Sepolia
- Runs deep chain-of-thought reasoning powered by **Groq + Llama-3.3-70b**
- Makes decisions on rebalancing, liquidation protection, and yield optimization
- Executes transactions on-chain
- Logs its complete reasoning process to PostgreSQL

---

## ✨ Key Features

- **Fully Autonomous Agent** — operates 24/7 without human intervention
- **Live On-Chain Monitoring** — real-time mETH vault data via RPC
- **LangGraph State Machine** — beautiful animated 5-step workflow visualization
- **Multi-Agent System** — WATCHER + VALIDATOR + EXECUTOR agents
- **On-Chain Identity** — ERC-721 NFT agent with reputation system (ERC-8004)
- **Real Transaction Execution** — via MetaMask / OKX Wallet
- **Full Decision History** — every thought and action saved in database
- **Immersive Cyberpunk UI** — glitch effects, scanlines, Framer Motion animations

---

## Live Infrastructure

| Service              | Link / Address                                              |
|----------------------|-------------------------------------------------------------|
| **Frontend**         | [talos-systems-talos-awwf.vercel.app](https://talos-systems-talos-awwf.vercel.app) |
| **Backend API**      | [talos-systems.onrender.com](https://talos-systems.onrender.com) |
| **Network**          | Mantle Sepolia Testnet                                      |
| **mETH Vault**       | `0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7`              |
| **NFT Contract**     | `0xc94da1ad1116fb6ab4ad7665351c1defec8b2de5`              |
| **RPC**              | https://rpc.sepolia.mantle.xyz                              |

---

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Express + TypeScript + Drizzle ORM
- **AI Engine**: Groq (Llama-3.3-70b)
- **Database**: PostgreSQL on Render
- **Blockchain**: ethers.js v6 + Mantle Sepolia
- **Hosting**: Vercel (Frontend) + Render (Backend + DB)

---

## API Endpoints

| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/api/agent/status`         | Current agent state                  |
| POST   | `/api/agent/think`          | Trigger reasoning cycle              |
| GET    | `/api/vault/stats`          | Live vault metrics                   |
| GET    | `/api/decisions`            | Decision & reasoning history         |
| GET    | `/api/protocols`            | DeFi protocols APY data              |
| POST   | `/api/nft/prepare-mint`     | Prepare agent NFT mint               |
| GET    | `/api/healthz`              | Health check                         |

---

## 🚀 Quick Start

```bash
git clone https://github.com/Artem1981777/talos-systems.git
cd talos-systems

pnpm install

# Copy environment variables
cp .env.example .env
# Add your DATABASE_URL and GROQ_API_KEY

# Start backend
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/talos run dev
