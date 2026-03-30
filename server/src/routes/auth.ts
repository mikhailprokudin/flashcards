import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const credentialsBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(256),
});

const patchMeBody = z.object({
  requireHandwritingInStudy: z.boolean(),
});

type AuthOpts = { db: AppDb };

function userPayload(row: {
  id: number;
  email: string;
  requireHandwritingStudy: number;
}) {
  return {
    id: row.id,
    email: row.email,
    requireHandwritingInStudy: row.requireHandwritingStudy === 1,
  };
}

export const authRoutes: FastifyPluginAsync<AuthOpts> = async (fastify, opts) => {
  const { db } = opts;

  fastify.post("/register", async (request, reply) => {
    const parsed = credentialsBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const passwordHash = await hashPassword(password);

    let userId: number;
    try {
      const inserted = await db
        .insert(users)
        .values({ email, passwordHash })
        .$returningId();
      const row = inserted[0];
      userId = row.id;
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "ER_DUP_ENTRY") {
        return reply.status(409).send({ error: "Email already registered" });
      }
      throw e;
    }

    const token = await reply.jwtSign({ sub: String(userId) });

    return reply.status(201).send({
      token,
      user: { id: userId, email, requireHandwritingInStudy: false },
    });
  });

  fastify.post("/login", async (request, reply) => {
    const parsed = credentialsBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        requireHandwritingStudy: users.requireHandwritingStudy,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const token = await reply.jwtSign({ sub: String(user.id) });

    return {
      token,
      user: userPayload(user),
    };
  });

  fastify.get(
    "/me",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const sub = request.user.sub;
      const id = Number(sub);
      if (!Number.isFinite(id)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          requireHandwritingStudy: users.requireHandwritingStudy,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      const user = rows[0];
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      return userPayload(user);
    },
  );

  fastify.patch(
    "/me",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const sub = request.user.sub;
      const id = Number(sub);
      if (!Number.isFinite(id)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const parsed = patchMeBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      await db
        .update(users)
        .set({
          requireHandwritingStudy: parsed.data.requireHandwritingInStudy ? 1 : 0,
        })
        .where(eq(users.id, id));

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          requireHandwritingStudy: users.requireHandwritingStudy,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      const user = rows[0];
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      return userPayload(user);
    },
  );
};
