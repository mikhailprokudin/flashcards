import type { FastifyReply, FastifyRequest } from "fastify";

export function getUserIdOr401(request: FastifyRequest, reply: FastifyReply): number | null {
  const sub = request.user.sub;
  const id = Number(sub);
  if (!Number.isFinite(id)) {
    void reply.status(401).send({ error: "Unauthorized" });
    return null;
  }
  return id;
}
