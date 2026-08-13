/**
 * Decision syncer (compatibility shim).
 *
 * TALOS is data-driven: trade decisions are produced by the agent/strategy
 * engine and persisted directly, not imported from external chain events.
 * This module is retained so existing callers keep working; it performs no
 * external sync and inserts nothing on its own.
 */
export async function syncOnChainEvents(): Promise<{ synced: number; skipped: number }> {
  return { synced: 0, skipped: 0 };
}
