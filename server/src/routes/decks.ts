import { and, asc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppDb } from "../db/client.js";
import { cards, decks } from "../db/schema.js";
import { getUserIdOr401 } from "../lib/requestUser.js";

const createDeckBody = z.object({
  name: z.string().min(1).max(512),
});

const updateDeckBody = z.object({
  name: z.string().min(1).max(512).optional(),
});

type DeckOpts = { db: AppDb };

export async function requireOwnedDeck(
  db: AppDb,
  userId: number,
  deckId: number,
): Promise<{ id: number; userId: number; name: string; createdAt: Date } | null> {
  const rows = await db
    .select({
      id: decks.id,
      userId: decks.userId,
      name: decks.name,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export const deckRoutes: FastifyPluginAsync<DeckOpts> = async (fastify, opts) => {
  const { db } = opts;

  fastify.get("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getUserIdOr401(request, reply);
    if (userId === null) return;

    const rows = await db
      .select({
        id: decks.id,
        name: decks.name,
        createdAt: decks.createdAt,
      })
      .from(decks)
      .where(eq(decks.userId, userId))
      .orderBy(asc(decks.createdAt));

    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt.toISOString(),
    }));
  });

  fastify.post("/", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getUserIdOr401(request, reply);
    if (userId === null) return;

    const parsed = createDeckBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const inserted = await db
      .insert(decks)
      .values({ userId, name: parsed.data.name })
      .$returningId();
    const id = inserted[0].id;

    const rows = await db
      .select({
        id: decks.id,
        name: decks.name,
        createdAt: decks.createdAt,
      })
      .from(decks)
      .where(eq(decks.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return reply.status(500).send({ error: "Failed to load deck" });
    }

    return reply.status(201).send({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    });
  });

  fastify.get("/:deckId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getUserIdOr401(request, reply);
    if (userId === null) return;

    const deckId = Number((request.params as { deckId: string }).deckId);
    if (!Number.isFinite(deckId)) {
      return reply.status(400).send({ error: "Invalid deck id" });
    }

    const deck = await requireOwnedDeck(db, userId, deckId);
    if (!deck) {
      return reply.status(404).send({ error: "Deck not found" });
    }

    return {
      id: deck.id,
      name: deck.name,
      createdAt: deck.createdAt.toISOString(),
    };
  });

  fastify.patch("/:deckId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getUserIdOr401(request, reply);
    if (userId === null) return;

    const deckId = Number((request.params as { deckId: string }).deckId);
    if (!Number.isFinite(deckId)) {
      return reply.status(400).send({ error: "Invalid deck id" });
    }

    const parsed = updateDeckBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    if (parsed.data.name === undefined) {
      return reply.status(400).send({ error: "No fields to update" });
    }

    const deck = await requireOwnedDeck(db, userId, deckId);
    if (!deck) {
      return reply.status(404).send({ error: "Deck not found" });
    }

    await db.update(decks).set({ name: parsed.data.name }).where(eq(decks.id, deckId));

    const rows = await db
      .select({
        id: decks.id,
        name: decks.name,
        createdAt: decks.createdAt,
      })
      .from(decks)
      .where(eq(decks.id, deckId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return reply.status(500).send({ error: "Failed to load deck" });
    }

    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  });

  fastify.delete("/:deckId", { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getUserIdOr401(request, reply);
    if (userId === null) return;

    const deckId = Number((request.params as { deckId: string }).deckId);
    if (!Number.isFinite(deckId)) {
      return reply.status(400).send({ error: "Invalid deck id" });
    }

    const deck = await requireOwnedDeck(db, userId, deckId);
    if (!deck) {
      return reply.status(404).send({ error: "Deck not found" });
    }

    await db.delete(decks).where(eq(decks.id, deckId));
    return reply.status(204).send();
  });
};
