import { and, asc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppDb } from "../db/client.js";
import { cards } from "../db/schema.js";
import { getUserIdOr401 } from "../lib/requestUser.js";
import { requireOwnedDeck } from "./decks.js";

const createCardBody = z.object({
  hanzi: z.string().min(1).max(64),
  pinyin: z.string().min(1).max(255),
  meaning: z.string().min(1).max(1024),
  example: z.string().max(2048).optional(),
  notes: z.string().max(8000).optional().nullable(),
});

const updateCardBody = z.object({
  hanzi: z.string().min(1).max(64).optional(),
  pinyin: z.string().min(1).max(255).optional(),
  meaning: z.string().min(1).max(1024).optional(),
  example: z.string().min(1).max(2048).optional(),
  notes: z.string().max(8000).optional().nullable(),
});

type CardOpts = { db: AppDb };

function serializeCard(row: {
  id: number;
  deckId: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    deckId: row.deckId,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    meaning: row.meaning,
    example: row.example,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export const cardRoutes: FastifyPluginAsync<CardOpts> = async (fastify, opts) => {
  const { db } = opts;

  fastify.get(
    "/:deckId/cards",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
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

      const rows = await db
        .select({
          id: cards.id,
          deckId: cards.deckId,
          hanzi: cards.hanzi,
          pinyin: cards.pinyin,
          meaning: cards.meaning,
          example: cards.example,
          notes: cards.notes,
          createdAt: cards.createdAt,
        })
        .from(cards)
        .where(eq(cards.deckId, deckId))
        .orderBy(asc(cards.createdAt));

      return rows.map(serializeCard);
    },
  );

  fastify.post(
    "/:deckId/cards",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
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

      const parsed = createCardBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const inserted = await db
        .insert(cards)
        .values({
          deckId,
          hanzi: parsed.data.hanzi,
          pinyin: parsed.data.pinyin,
          meaning: parsed.data.meaning,
          example: parsed.data.example ?? "",
          notes: parsed.data.notes ?? null,
        })
        .$returningId();
      const id = inserted[0].id;

      const rows = await db
        .select({
          id: cards.id,
          deckId: cards.deckId,
          hanzi: cards.hanzi,
          pinyin: cards.pinyin,
          meaning: cards.meaning,
          example: cards.example,
          notes: cards.notes,
          createdAt: cards.createdAt,
        })
        .from(cards)
        .where(eq(cards.id, id))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return reply.status(500).send({ error: "Failed to load card" });
      }

      return reply.status(201).send(serializeCard(row));
    },
  );

  fastify.get(
    "/:deckId/cards/:cardId",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserIdOr401(request, reply);
      if (userId === null) return;

      const deckId = Number((request.params as { deckId: string }).deckId);
      const cardId = Number((request.params as { cardId: string }).cardId);
      if (!Number.isFinite(deckId) || !Number.isFinite(cardId)) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const deck = await requireOwnedDeck(db, userId, deckId);
      if (!deck) {
        return reply.status(404).send({ error: "Deck not found" });
      }

      const rows = await db
        .select({
          id: cards.id,
          deckId: cards.deckId,
          hanzi: cards.hanzi,
          pinyin: cards.pinyin,
          meaning: cards.meaning,
          example: cards.example,
          notes: cards.notes,
          createdAt: cards.createdAt,
        })
        .from(cards)
        .where(and(eq(cards.id, cardId), eq(cards.deckId, deckId)))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return reply.status(404).send({ error: "Card not found" });
      }

      return serializeCard(row);
    },
  );

  fastify.patch(
    "/:deckId/cards/:cardId",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserIdOr401(request, reply);
      if (userId === null) return;

      const deckId = Number((request.params as { deckId: string }).deckId);
      const cardId = Number((request.params as { cardId: string }).cardId);
      if (!Number.isFinite(deckId) || !Number.isFinite(cardId)) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const deck = await requireOwnedDeck(db, userId, deckId);
      if (!deck) {
        return reply.status(404).send({ error: "Deck not found" });
      }

      const parsed = updateCardBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const patch = parsed.data;
      if (
        patch.hanzi === undefined &&
        patch.pinyin === undefined &&
        patch.meaning === undefined &&
        patch.example === undefined &&
        patch.notes === undefined
      ) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      const existing = await db
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.id, cardId), eq(cards.deckId, deckId)))
        .limit(1);

      if (!existing[0]) {
        return reply.status(404).send({ error: "Card not found" });
      }

      const set: Partial<{
        hanzi: string;
        pinyin: string;
        meaning: string;
        example: string;
        notes: string | null;
      }> = {};
      if (patch.hanzi !== undefined) set.hanzi = patch.hanzi;
      if (patch.pinyin !== undefined) set.pinyin = patch.pinyin;
      if (patch.meaning !== undefined) set.meaning = patch.meaning;
      if (patch.example !== undefined) set.example = patch.example;
      if (patch.notes !== undefined) set.notes = patch.notes;

      await db.update(cards).set(set).where(eq(cards.id, cardId));

      const rows = await db
        .select({
          id: cards.id,
          deckId: cards.deckId,
          hanzi: cards.hanzi,
          pinyin: cards.pinyin,
          meaning: cards.meaning,
          example: cards.example,
          notes: cards.notes,
          createdAt: cards.createdAt,
        })
        .from(cards)
        .where(eq(cards.id, cardId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return reply.status(500).send({ error: "Failed to load card" });
      }

      return serializeCard(row);
    },
  );

  fastify.delete(
    "/:deckId/cards/:cardId",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserIdOr401(request, reply);
      if (userId === null) return;

      const deckId = Number((request.params as { deckId: string }).deckId);
      const cardId = Number((request.params as { cardId: string }).cardId);
      if (!Number.isFinite(deckId) || !Number.isFinite(cardId)) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const deck = await requireOwnedDeck(db, userId, deckId);
      if (!deck) {
        return reply.status(404).send({ error: "Deck not found" });
      }

      const found = await db
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.id, cardId), eq(cards.deckId, deckId)))
        .limit(1);

      if (!found[0]) {
        return reply.status(404).send({ error: "Card not found" });
      }

      await db.delete(cards).where(eq(cards.id, cardId));
      return reply.status(204).send();
    },
  );
};
