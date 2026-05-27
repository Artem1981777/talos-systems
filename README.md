# TALOS Systems v2.0 — Autonomous AI DeFi Agent

> **Tactical Autonomous Liquidation Operations System**
> 
> **Turing Test Hackathon 2026 — AI x RWA Track**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-talos--systems.vercel.app-green)](https://talos-systems-talos-awwf.vercel.app)
[![API](https://img.shields.io/badge/API-talos--systems.onrender.com-blue)](https://talos-systems.onrender.com)
[![Network](https://img.shields.io/badge/Network-Mantle%20Sepolia-purple)](https://mantle.xyz)

---

## What is TALOS v2.0?

TALOS is a **fully autonomous AI agent** that protects and optimizes DeFi vaults using **real LLM reasoning** with **ReAct pattern**, **persistent memory**, and **on-chain execution** on Mantle Network.

### Key Upgrades from v1.0

| Feature | v1.0 | v2.0 |
|---------|------|------|
| AI Engine | Groq only | Multi-provider (OpenAI + Anthropic + Groq) with Mock LLM fallback |
| Reasoning | Simple CoT | ReAct pattern with tool calling |
| Memory | None | diskcache short-term + JSON long-term |
| Risk Engine | Basic thresholds | VaR, Kelly Criterion, Sharpe Ratio |
| Multi-Agent | Hardcoded | AI-powered WATCHER/VALIDATOR with reasoning |
| Fallback | Crash | Risk Engine auto-fallback + Mock LLM |

---

## Architecture
┌─────────────────────────────────────────┐
│  FRONTEND (React + Vercel)              │
│  Cyberpunk UI, Real-time Dashboard      │
├─────────────────────────────────────────┤
│  API SERVER (Express + Render)            │
│  WebSocket, REST API                    │
├─────────────────────────────────────────┤
│  AI ENGINE (Python)                     │
│  ├─ Multi-Provider LLM Manager          │
│  │   OpenAI → Anthropic → Groq → Mock   │
│  ├─ ReAct Agent (Reasoning + Acting)    │
│  ├─ Risk Engine (VaR, Kelly, Sharpe)    │
│  └─ Memory (diskcache + JSON)            │
├─────────────────────────────────────────┤
│  BLOCKCHAIN (Mantle Sepolia)            │
│  ├─ AgentIdentity.sol (ERC-721)        │
│  ├─ VaultManager.sol (planned)          │
│  └─ mETH Vault Monitoring               │
└─────────────────────────────────────────┘

---

## Quick Start

```bash
# Clone
git clone https://github.com/Artem1981777/talos-systems.git
cd talos-systems

# Install Python deps
pip install requests diskcache

# Run with Mock LLM (no API keys needed!)
export USE_MOCK_LLM=true
PYTHONPATH=$(pwd) python3 src/main.py

# Or with real LLM
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GROQ_API_KEY=gsk-...
PYTHONPATH=$(pwd) python3 src/main.py
AI Engine Features
Multi-Provider LLM with Circuit Breaker
Priority: OpenAI GPT-4o → Anthropic Claude 3.5 → Groq Llama 3.3
Circuit Breaker: Auto-recovery after failures
Mock LLM: Works without any API keys for demo/testing
ReAct Agent (Reasoning + Acting)
OBSERVE → ANALYZE → DECIDE → PLAN → EXECUTE
Tool calling: get_vault_state, get_market_data, calculate_risk_metrics
Max 5 iterations, conservative fallback
Risk Engine (Formal Mathematics)
VaR (Value at Risk): 95% confidence interval
Kelly Criterion: Optimal position sizing
Sharpe Ratio: Risk-adjusted return
Liquidation Probability: Black-Scholes inspired model
Agent Memory
Short-term: diskcache (7 days TTL)
Long-term: JSON file (importance > 0.7)
Consolidation: Auto-summarize old entries
Live Demo
Frontend: https://talos-systems-talos-awwf.vercel.app
API: https://talos-systems.onrender.com
Demo Video: https://youtube.com/shorts/-fU0SNQzJRQ
| Layer      | Technologies                                        |
| ---------- | --------------------------------------------------- |
| Frontend   | React 18, Vite, TypeScript, Tailwind, Framer Motion |
| Backend    | Express, TypeScript, Drizzle ORM, WebSocket         |
| AI Engine  | Python, Multi-Provider LLM, ReAct, Circuit Breaker  |
| Memory     | diskcache, JSON                                     |
| Risk       | Custom VaR, Kelly, Sharpe                           |
| Blockchain | Mantle Sepolia, ethers.js v6, Solidity 0.8.20       |
| Infra      | Vercel, Render, PostgreSQL                          |

Project Status
✅ Multi-provider LLM with fallback
✅ ReAct agent with tool calling
✅ Risk engine (VaR, Kelly, Sharpe)
✅ Agent memory (short + long term)
✅ Mock LLM for demo without API keys
✅ On-chain RPC integration (Mantle Sepolia)
✅ WebSocket real-time updates
🔄 Flash loan arbitrage (planned)
🔄 Cross-protocol rebalancing (planned)
🔄 Strategy NFT minting (planned)
🔄 3D agent visualization (planned)

License
MIT License — see LICENSE for details.
Team
Built by Artem1981777 for Turing Test Hackathon 2026 — AI x RWA Track.
