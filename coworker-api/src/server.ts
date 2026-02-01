import { app } from "./app.js";
import { env, logger, prisma } from "./config/index.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${String(env.PORT)}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(() => {
    logger.info("HTTP server closed");

    prisma.$disconnect().then(() => {
      logger.info("Database connection closed");
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});
