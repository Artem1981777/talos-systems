import { pgTable, serial, text, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const decisionStatusEnum = pgEnum("decision_status", ["pending", "executed", "failed", "simulated"]);
export const agentModeEnum = pgEnum("agent_mode", ["autonomous", "paused", "simulation"]);

export const agentStateTable = pgTable("agent_state", {
  id: serial("id").primaryKey(),
  isRunning: boolean("is_running").notNull().default(false),
  mode: agentModeEnum("mode").notNull().default("paused"),
  nftTokenId: text("nft_token_id"),
  totalDecisions: integer("total_decisions").notNull().default(0),
  totalRoiPercent: real("total_roi_percent").notNull().default(0),
  reputationScore: integer("reputation_score").notNull().default(0),
  lastCycleAt: timestamp("last_cycle_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  protocol: text("protocol").notNull(),
  amount: text("amount").notNull(),
  reasoning: text("reasoning").notNull(),
  chainOfThought: text("chain_of_thought").notNull(),
  confidence: real("confidence").notNull(),
  expectedRoi: real("expected_roi").notNull(),
  actualRoi: real("actual_roi"),
  txHash: text("tx_hash"),
  status: decisionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  executedAt: timestamp("executed_at"),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, createdAt: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;
export type AgentState = typeof agentStateTable.$inferSelect;
