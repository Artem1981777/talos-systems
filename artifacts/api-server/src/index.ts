import app from "./app";
import { logger } from "./lib/logger";
import { syncOnChainEvents } from "./lib/eventSync.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Non-blocking startup sync — pull on-chain Transfer events into DB
  syncOnChainEvents()
    .then(({ synced, skipped }) => {
      if (synced > 0) logger.info({ synced, skipped }, "On-chain events synced on startup");
    })
    .catch((err) => logger.warn({ err }, "Startup event sync failed (non-fatal)"));
});
