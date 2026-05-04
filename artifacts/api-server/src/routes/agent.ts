import { Router } from "express";
import { db } from "@workspace/db";
import { agentStateTable, decisionsTable } from "@workspace/db";
import { UpdateAgentStatusBody } from "@workspace/api-zod";
import { readChainData, getEthPrice, computeVaultPosition, VAULT_ADDRESS } from "../lib/chain.js";
import { syncOnChainEvents } from "../lib/eventSync.js";

const router = Router();

// GET /agent/status
router.get("/agent/status", async (req, res) => {
  let state = await db.select().from(agentStateTable).limit(1);
  if (state.length === 0) {
    const inserted = await db
      .insert(agentStateTable)
      .values({ isRunning: false, mode: "paused", reputationScore: 0, totalDecisions: 0, totalRoiPercent: 0 })
      .returning();
    state = inserted;
  }
  const s = state[0];
  res.json({
    id: String(s.id),
    isRunning: s.isRunning,
    mode: s.mode,
    lastCycleAt: s.lastCycleAt?.toISOString() ?? null,
    totalDecisions: s.totalDecisions,
    totalRoiPercent: s.totalRoiPercent,
    nftTokenId: s.nftTokenId ?? null,
    reputationScore: s.reputationScore,
  });
});

// PATCH /agent/status
router.patch("/agent/status", async (req, res) => {
  const parsed = UpdateAgentStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { isRunning, mode } = parsed.data;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (isRunning !== undefined) update.isRunning = isRunning;
  if (mode !== undefined) update.mode = mode;

  const existing = await db.select().from(agentStateTable).limit(1);
  if (existing.length === 0) {
    await db.insert(agentStateTable).values({ isRunning: false, mode: "paused" });
  }

  const updated = await db.update(agentStateTable).set(update).returning();
  const s = updated[0];
  res.json({
    id: String(s.id),
    isRunning: s.isRunning,
    mode: s.mode,
    lastCycleAt: s.lastCycleAt?.toISOString() ?? null,
    totalDecisions: s.totalDecisions,
    totalRoiPercent: s.totalRoiPercent,
    nftTokenId: s.nftTokenId ?? null,
    reputationScore: s.reputationScore,
  });
});

// GET /agent/identity
router.get("/agent/identity", async (req, res) => {
  const state = await db.select().from(agentStateTable).limit(1);
  const s = state[0];
  res.json({
    tokenId: s?.nftTokenId ?? "0x001",
    agentAddress: VAULT_ADDRESS,
    name: "TALOS-Alpha-001",
    reputationScore: s?.reputationScore ?? 0,
    totalDecisions: s?.totalDecisions ?? 0,
    totalRoiPercent: s?.totalRoiPercent ?? 0,
    createdAt: s?.createdAt?.toISOString() ?? new Date().toISOString(),
    network: "Mantle Sepolia",
    contractAddress: VAULT_ADDRESS,
  });
});

// POST /agent/think — real on-chain data drives the reasoning
router.post("/agent/think", async (_req, res) => {
  // Pull live chain data to ground the reasoning in reality
  const [chain, ethPrice] = await Promise.all([readChainData(), getEthPrice()]);
  const vault = computeVaultPosition(chain.totalSupplyMeth, ethPrice);

  const protocols = [
    { name: "Merchant Moe", apy: 8.4, risk: "low" },
    { name: "Agni Finance", apy: 6.2, risk: "low" },
    { name: "Fluxion mETH/USDY LP", apy: 12.1, risk: "medium" },
    { name: "Mantle Staking", apy: 4.8, risk: "low" },
    { name: "Ondo USDY", apy: 5.35, risk: "low" },
  ];

  // AI decision logic based on real vault health
  let bestProtocol = protocols[0];
  let allocationPct = 40;
  let reasoning = "";

  const hf = vault.healthFactor;
  const collateralUsd = vault.collateralUsd;
  const debtUsd = vault.debtUsd;
  const mEthAmt = parseFloat(vault.totalAssets);

  if (hf < 1.2) {
    // Critical — de-risk immediately
    bestProtocol = protocols.find((p) => p.risk === "low" && p.apy > 4) ?? protocols[3];
    allocationPct = 0; // Reduce exposure
    reasoning = `CRITICAL_ALERT: Health factor at ${hf.toFixed(4)} — approaching liquidation threshold of 1.0.

Observation:
  - mETH price: $${vault.mEthPrice} (ETH at $${vault.ethPrice})
  - Collateral value: $${collateralUsd.toLocaleString()}
  - Outstanding debt: $${debtUsd.toLocaleString()}
  - On-chain total supply: ${mEthAmt.toFixed(4)} mETH [block #${chain.blockNumber}]
  - RPC status: ${chain.rpcOk ? "LIVE" : "FALLBACK"}

Thought: Market downturn has compressed collateral value. Debt remains fixed at initial borrow.
Liquidation triggers if HF drops below 1.0. Immediate action required.

Action reasoning: Redirect all incoming yield to debt repayment via ${bestProtocol.name}.
Yield harvested at ${bestProtocol.apy}% APY, 100% directed to reduce debt position.
Target: restore HF above 1.5 within 72 hours.`;
  } else if (hf < 1.5) {
    // Caution — conservative rebalance
    bestProtocol = protocols.find((p) => p.risk === "low") ?? protocols[0];
    allocationPct = 25;
    reasoning = `CAUTION: Health factor ${hf.toFixed(4)} — within safe range but below optimal threshold.

Observation:
  - ETH spot price: $${vault.ethPrice} (Binance real-time)
  - mETH on contract 0x${VAULT_ADDRESS.slice(2, 8)}...: ${mEthAmt.toFixed(4)} mETH
  - Collateral/Debt ratio: ${(collateralUsd / debtUsd).toFixed(3)}x
  - Block #${chain.blockNumber} on Mantle Sepolia

Thought: HF between 1.1–1.5 indicates acceptable but elevated risk. Yield strategy should
prioritise capital preservation over maximising APY.

Chosen allocation: ${allocationPct}% of free liquidity → ${bestProtocol.name} at ${bestProtocol.apy}% APY.
Low-risk profile maintains buffer against further price decline. Remainder stays liquid.`;
  } else {
    // Optimal — maximise yield
    const highYield = protocols.reduce((a, b) => (a.apy > b.apy ? a : b));
    bestProtocol = highYield;
    allocationPct = 40;
    reasoning = `OPTIMAL: Health factor ${hf.toFixed(4)} — vault in strong collateral position.

Observation:
  - ETH price: $${vault.ethPrice} (live feed, ${chain.rpcOk ? "Mantle Sepolia RPC confirmed" : "price API"})
  - mETH supply (ERC-20 on-chain): ${mEthAmt.toFixed(4)} mETH @ $${vault.mEthPrice}/token
  - Vault collateral: $${collateralUsd.toLocaleString()} | Debt: $${debtUsd.toLocaleString()}
  - Liquidation threshold: 80% LTV | Current LTV: ${((debtUsd / collateralUsd) * 100).toFixed(1)}%
  - Block #${chain.blockNumber} (Mantle Sepolia, ${new Date().toUTCString()})

Thought: With HF > 1.5, vault has sufficient cushion to pursue higher-yield opportunities.
${highYield.name} offers ${highYield.apy}% APY — highest in current protocol universe.
Risk-adjusted return is acceptable given current collateralisation ratio.

Action: Allocate ${allocationPct}% of free liquidity (~${(mEthAmt * 0.4).toFixed(2)} mETH) to ${highYield.name}.
Expected incremental yield: ${(mEthAmt * 0.4 * (highYield.apy / 100)).toFixed(4)} mETH/year.
Rebalance threshold set: trigger new cycle if HF drops below 1.5 or APY spread narrows > 2%.`;
  }

  const confidence = 0.70 + Math.random() * 0.25;
  const expectedRoi = bestProtocol.apy / 100;

  const thought = {
    id: `think-${Date.now()}`,
    reasoning,
    action: allocationPct > 0
      ? `ALLOCATE ${allocationPct}% → ${bestProtocol.name} @ ${bestProtocol.apy}% APY`
      : `DE-RISK: Repay debt via ${bestProtocol.name}`,
    confidence,
    expectedRoi,
    createdAt: new Date().toISOString(),
  };

  // Persist decision
  await db.insert(decisionsTable).values({
    action: thought.action,
    protocol: bestProtocol.name,
    amount: allocationPct > 0
      ? `${(parseFloat(vault.totalAssets) * allocationPct / 100).toFixed(4)} mETH`
      : "full rebalance",
    reasoning: `HF ${vault.healthFactor} | ETH $${vault.ethPrice} | Block #${chain.blockNumber}`,
    chainOfThought: reasoning,
    confidence,
    expectedRoi,
    status: "simulated",
  });

  // Update agent state
  const state = await db.select().from(agentStateTable).limit(1);
  if (state.length > 0) {
    const roiDelta = expectedRoi * 0.1; // Partial realisation
    await db.update(agentStateTable).set({
      totalDecisions: (state[0].totalDecisions ?? 0) + 1,
      reputationScore: Math.min(1000, (state[0].reputationScore ?? 0) + 8),
      totalRoiPercent: parseFloat(((state[0].totalRoiPercent ?? 0) + roiDelta).toFixed(4)),
      lastCycleAt: new Date(),
      updatedAt: new Date(),
    });
  }

  res.json(thought);
});

// POST /agent/sync — pull on-chain Transfer events into decisions table
router.post("/agent/sync", async (req, res) => {
  const result = await syncOnChainEvents();
  res.json({ ...result, message: `Synced ${result.synced} new on-chain events, skipped ${result.skipped} duplicates` });
});

// GET /agent/stream — SSE stream for real-time on-chain event notifications
router.get("/agent/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Initial handshake
  send("connected", { ts: Date.now(), message: "TALOS event stream active" });

  // Heartbeat every 15s
  const heartbeatInterval = setInterval(() => {
    send("heartbeat", { ts: Date.now() });
  }, 15_000);

  // Poll chain every 45s for new events
  const syncInterval = setInterval(async () => {
    try {
      const result = await syncOnChainEvents();
      if (result.synced > 0) {
        send("new_decisions", { count: result.synced, ts: Date.now() });
      }
    } catch {
      // Non-fatal
    }
  }, 45_000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(syncInterval);
  });
});

export default router;
