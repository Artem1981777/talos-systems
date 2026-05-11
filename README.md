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
