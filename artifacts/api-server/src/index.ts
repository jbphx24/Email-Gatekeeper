import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

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

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(async () => {
    await pool.end();
    logger.info("Database pool closed");
    process.exit(0);
  });
}

process.once("SIGTERM", () => { shutdown("SIGTERM").catch((err) => { logger.error({ err }, "Error during shutdown"); process.exit(1); }); });
process.once("SIGINT",  () => { shutdown("SIGINT").catch((err)  => { logger.error({ err }, "Error during shutdown"); process.exit(1); }); });
