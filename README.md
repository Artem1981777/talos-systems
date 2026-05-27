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
cd ~/talos-v4/talos-systems

cat >> README.md << 'MDEOF'

---

## 🌐 Allora Network Integration (v2.1)

TALOS integrates with **Allora Network** for decentralized AI inference verification:

- **Decentralized Reputation**: Every agent decision is scored by consensus
- **Trustless Verification**: No single point of failure for AI evaluation
- **On-chain Reputation NFT**: ERC-8004 compliant agent identity with Allora scores

### Allora Features:
- ✅ Submit predictions to Allora Network
- ✅ Get consensus scores for decisions
- ✅ Agent reputation tiers (NOVICE → LEGENDARY)
- ✅ Mock mode for demo without API keys
- ✅ Real API mode with Allora API key

### Allora Reputation Tiers:
| Tier | Score | Description |
|------|-------|-------------|
| NOVICE | 0-4000 | Starting agent |
| INTERMEDIATE | 4000-6000 | Proven track record |
| ADVANCED | 6000-8000 | Reliable performer |
| EXPERT | 8000-9000 | Top performer |
| LEGENDARY | 9000+ | Elite agent |

---

## 🏆 Turing Test Hackathon 2026 — AI x RWA Track

### Judging Criteria Alignment:

| Criteria | TALOS Implementation |
|----------|-------------------|
| **ERC-8004 Agent Identity** | AgentIdentity.sol with reputation |
| **On-chain Benchmarking** | Allora Network integration |
| **AI Reasoning** | ReAct pattern with tool calling |
| **Risk Management** | VaR, Kelly, Sharpe formal engine |
| **Human vs AI** | Planned: User challenge mode |
| **mETH Vault Management** | Live Mantle Sepolia integration |

### Co-Sponsors Integration:
- **Bybit**: Trading API integration (planned)
- **Merchant Moe**: DEX integration (planned)
- **Agni Finance**: Lending integration (planned)
- **Fluxion**: Yield optimization (planned)

---

## 🚀 Quick Start with Allora

```bash
# Run with Mock Allora (no API key needed)
export USE_MOCK_ALLORA=true
export USE_MOCK_LLM=true
PYTHONPATH=$(pwd) python3 src/main.py

# Run with Real Allora (get API key at https://allora.network)
export ALLORA_API_KEY=your_key_here
export ALLORA_TOPIC_ID=1
PYTHONPATH=$(pwd) python3 src/main.py
