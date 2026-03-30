import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { envSchema } from "./config/env.js";
import { createDb } from "./db/client.js";
import { authRoutes } from "./routes/auth.js";
import { cardRoutes } from "./routes/cards.js";
import { deckRoutes } from "./routes/decks.js";
import { studyRoutes } from "./routes/study.js";

const env = envSchema.parse(process.env);

const { db, pool } = createDb(env.DATABASE_URL);

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true as const }));

await app.register(async (fastify) => {
  const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  await fastify.register(cors, {
    origin: corsOrigins.length ? corsOrigins : true,
  });

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  fastify.decorate(
    "authenticate",
    async function authenticate(request, reply) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    },
  );

  await fastify.register(authRoutes, { db, prefix: "/auth" });
  await fastify.register(cardRoutes, { db, prefix: "/decks" });
  await fastify.register(deckRoutes, { db, prefix: "/decks" });
  await fastify.register(studyRoutes, { db, prefix: "/study" });
});

const shutdown = async () => {
  await pool.end();
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  await pool.end();
  process.exit(1);
}
