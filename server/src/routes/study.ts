import { and, asc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppDb } from "../db/client.js";
import { cardProgress, cards, decks } from "../db/schema.js";
import { applyReview, type ProgressStatus } from "../lib/srs/applyReview.js";
import { getUserIdOr401 } from "../lib/requestUser.js";
import { requireOwnedDeck } from "./decks.js";

const queueQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  maxNew: z.coerce.number().int().nonnegative().max(50).default(5),
});

const reviewBody = z.object({
  cardId: z.coerce.number().int().positive(),
  result: z.enum(["know", "dont_know"]),
});

type StudyOpts = { db: AppDb };

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

function serializeProgress(p: {
  status: ProgressStatus;
  step: number;
  firstShownAt: Date | null;
  nextDueAt: Date | null;
  lastReviewAt: Date | null;
  lastResult: "know" | "dont_know" | null;
}) {
  return {
    status: p.status,
    step: p.step,
    firstShownAt: p.firstShownAt?.toISOString() ?? null,
    nextDueAt: p.nextDueAt?.toISOString() ?? null,
    lastReviewAt: p.lastReviewAt?.toISOString() ?? null,
    lastResult: p.lastResult,
  };
}

type QueueItem = {
  card: ReturnType<typeof serializeCard>;
  progress: ReturnType<typeof serializeProgress> | null;
};

function interleaveQueue(a: QueueItem[], b: QueueItem[]): QueueItem[] {
  const out: QueueItem[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export const studyRoutes: FastifyPluginAsync<StudyOpts> = async (fastify, opts) => {
  const { db } = opts;

  fastify.get(
    "/decks/:deckId/queue",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserIdOr401(request, reply);
      if (userId === null) return;

      const deckId = Number((request.params as { deckId: string }).deckId);
      if (!Number.isFinite(deckId)) {
        return reply.status(400).send({ error: "Invalid deck id" });
      }

      const parsed = queueQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid query", details: parsed.error.flatten() });
      }
      const { limit, maxNew } = parsed.data;

      const deck = await requireOwnedDeck(db, userId, deckId);
      if (!deck) {
        return reply.status(404).send({ error: "Deck not found" });
      }

      const now = new Date();

      const dueRows = await db
        .select({
          card: {
            id: cards.id,
            deckId: cards.deckId,
            hanzi: cards.hanzi,
            pinyin: cards.pinyin,
            meaning: cards.meaning,
            example: cards.example,
            notes: cards.notes,
            createdAt: cards.createdAt,
          },
          progress: {
            status: cardProgress.status,
            step: cardProgress.step,
            firstShownAt: cardProgress.firstShownAt,
            nextDueAt: cardProgress.nextDueAt,
            lastReviewAt: cardProgress.lastReviewAt,
            lastResult: cardProgress.lastResult,
          },
        })
        .from(cards)
        .innerJoin(cardProgress, and(eq(cardProgress.cardId, cards.id), eq(cardProgress.userId, userId)))
        .where(
          and(
            eq(cards.deckId, deckId),
            isNotNull(cardProgress.nextDueAt),
            lte(cardProgress.nextDueAt, now),
          ),
        )
        .orderBy(asc(cardProgress.nextDueAt))
        .limit(limit);

      let newCandidates: {
        card: {
          id: number;
          deckId: number;
          hanzi: string;
          pinyin: string;
          meaning: string;
          example: string;
          notes: string | null;
          createdAt: Date;
        };
      }[] = [];

      if (maxNew > 0) {
        newCandidates = await db
          .select({
            card: {
              id: cards.id,
              deckId: cards.deckId,
              hanzi: cards.hanzi,
              pinyin: cards.pinyin,
              meaning: cards.meaning,
              example: cards.example,
              notes: cards.notes,
              createdAt: cards.createdAt,
            },
          })
          .from(cards)
          .leftJoin(
            cardProgress,
            and(eq(cardProgress.cardId, cards.id), eq(cardProgress.userId, userId)),
          )
          .where(and(eq(cards.deckId, deckId), isNull(cardProgress.userId)))
          .orderBy(asc(cards.createdAt))
          .limit(maxNew);
      }

      const duePayload: QueueItem[] = dueRows.map((r) => ({
        card: serializeCard(r.card),
        progress: serializeProgress({
          status: r.progress.status as ProgressStatus,
          step: r.progress.step,
          firstShownAt: r.progress.firstShownAt,
          nextDueAt: r.progress.nextDueAt,
          lastReviewAt: r.progress.lastReviewAt,
          lastResult: r.progress.lastResult,
        }),
      }));

      const newPayload: QueueItem[] = newCandidates.map((r) => ({
        card: serializeCard(r.card),
        progress: null,
      }));

      const mixed = interleaveQueue(duePayload, newPayload).slice(0, limit);

      return { items: mixed };
    },
  );

  fastify.post(
    "/review",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserIdOr401(request, reply);
      if (userId === null) return;

      const parsed = reviewBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const { cardId, result } = parsed.data;
      const now = new Date();

      const progressPayload = await db.transaction(async (tx) => {
        const rows = await tx
          .select({
            card: { id: cards.id, deckId: cards.deckId },
            ownerId: decks.userId,
          })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(eq(cards.id, cardId))
          .limit(1);

        const row = rows[0];
        if (!row || row.ownerId !== userId) {
          return null;
        }

        const progressRows = await tx
          .select({
            status: cardProgress.status,
            step: cardProgress.step,
            firstShownAt: cardProgress.firstShownAt,
            nextDueAt: cardProgress.nextDueAt,
            lastReviewAt: cardProgress.lastReviewAt,
            lastResult: cardProgress.lastResult,
          })
          .from(cardProgress)
          .where(and(eq(cardProgress.userId, userId), eq(cardProgress.cardId, cardId)))
          .limit(1);

        const existing = progressRows[0];

        const state = existing
          ? {
              status: existing.status as ProgressStatus,
              step: existing.step,
              firstShownAt: existing.firstShownAt,
            }
          : { status: "not_started" as const, step: 0, firstShownAt: null };

        const out = applyReview({
          now,
          result,
          state,
        });

        if (existing) {
          await tx
            .update(cardProgress)
            .set({
              status: out.status,
              step: out.step,
              firstShownAt: out.firstShownAt,
              nextDueAt: out.nextDueAt,
              lastReviewAt: out.lastReviewAt,
              lastResult: out.lastResult,
            })
            .where(and(eq(cardProgress.userId, userId), eq(cardProgress.cardId, cardId)));
        } else {
          await tx.insert(cardProgress).values({
            userId,
            cardId,
            status: out.status,
            step: out.step,
            firstShownAt: out.firstShownAt,
            nextDueAt: out.nextDueAt,
            lastReviewAt: out.lastReviewAt,
            lastResult: out.lastResult,
          });
        }

        return out;
      });

      if (!progressPayload) {
        return reply.status(404).send({ error: "Card not found" });
      }

      return {
        progress: serializeProgress({
          status: progressPayload.status,
          step: progressPayload.step,
          firstShownAt: progressPayload.firstShownAt,
          nextDueAt: progressPayload.nextDueAt,
          lastReviewAt: progressPayload.lastReviewAt,
          lastResult: progressPayload.lastResult,
        }),
      };
    },
  );
};
