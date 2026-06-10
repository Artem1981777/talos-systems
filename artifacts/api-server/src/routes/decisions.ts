import { Router } from "express";
import { db } from "@workspace/db";
import { decisionsTable, agentStateTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
import { CreateDecisionBody } from "@workspace/api-zod";

const router = Router();

// GET /decisions
router.get("/decisions", async (req, res) => {
  const limit = parseInt(String(req.query.limit ?? "20"));
  const offset = parseInt(String(req.query.offset ?? "0"));

  const [rows, totalRows] = await Promise.all([
    db.select().from(decisionsTable).orderBy(desc(decisionsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(decisionsTable),
  ]);

  res.json({
    decisions: rows.map((d) => ({
      id: d.id,
      action: d.action,
      protocol: d.protocol,
      amount: d.amount,
      reasoning: d.reasoning,
      chainOfThought: d.chainOfThought,
      confidence: d.confidence,
      expectedRoi: d.expectedRoi,
      actualRoi: d.actualRoi ?? null,
      txHash: d.txHash ?? null,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      executedAt: d.executedAt?.toISOString() ?? null,
    })),
    total: totalRows[0].count,
  });
});

// POST /decisions
router.post("/decisions", async (req, res) => {
  const parsed = CreateDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const inserted = await db
    .insert(decisionsTable)
    .values({
      action: parsed.data.action,
      protocol: parsed.data.protocol,
      amount: parsed.data.amount,
      reasoning: parsed.data.reasoning,
      chainOfThought: parsed.data.chainOfThought,
      confidence: parsed.data.confidence,
      expectedRoi: parsed.data.expectedRoi,
      txHash: parsed.data.txHash ?? null,
      status: parsed.data.status,
    })
    .returning();

  const d = inserted[0];
  res.status(201).json({
    id: d.id,
    action: d.action,
    protocol: d.protocol,
    amount: d.amount,
    reasoning: d.reasoning,
    chainOfThought: d.chainOfThought,
    confidence: d.confidence,
    expectedRoi: d.expectedRoi,
    actualRoi: d.actualRoi ?? null,
    txHash: d.txHash ?? null,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    executedAt: d.executedAt?.toISOString() ?? null,
  });
});

// GET /decisions/summary
router.get("/decisions/summary", async (req, res) => {
  const [allDecisions, state] = await Promise.all([
    db.select().from(decisionsTable),
    db.select().from(agentStateTable).limit(1),
  ]);

  const executed = allDecisions.filter((d) => d.status === "executed");
  const simulated = allDecisions.filter((d) => d.status === "simulated");
  const totalRoi = allDecisions.reduce((sum, d) => sum + (d.actualRoi ?? d.expectedRoi), 0);
  const avgConf = allDecisions.length
    ? allDecisions.reduce((sum, d) => sum + d.confidence, 0) / allDecisions.length
    : 0;

  const protocolCounts: Record<string, number> = {};
  for (const d of allDecisions) {
    protocolCounts[d.protocol] = (protocolCounts[d.protocol] ?? 0) + 1;
  }
  const topProtocol =
    Object.entries(protocolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  res.json({
    totalDecisions: allDecisions.length,
    executedDecisions: executed.length,
    simulatedDecisions: simulated.length,
    totalRoiPercent: parseFloat((totalRoi * 100).toFixed(2)),
    avgConfidence: parseFloat(avgConf.toFixed(3)),
    topProtocol,
    reputationScore: state[0]?.reputationScore ?? 0,
  });
});

export default router;
