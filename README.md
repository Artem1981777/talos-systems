License
MIT License — see LICENSE for details.
Team
Built by Artem1981777 for Turing Test Hackathon 2026 — AI x RWA Track.

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
PYTHONPATH=$(pwd) python3 src/main.py

# Run with Real Allora (get API key at https://allora.network)
export ALLORA_API_KEY=your_key_here
export ALLORA_TOPIC_ID=1
PYTHONPATH=$(pwd) python3 src/main.py
```
