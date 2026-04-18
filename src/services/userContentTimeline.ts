import { getPrismaClient } from "@/db/prisma";

/**
 * Unified content timeline for a given user — aggregates everything the user
 * has written across the app into a normalized shape, sorted by date desc.
 * Used by the admin panel to review / moderate / export.
 */

export type ContentType =
  | "message"
  | "post"
  | "anon_question"
  | "anon_answer"
  | "diary"
  | "checkin"
  | "win"
  | "feedback";

export const CONTENT_TYPES: ContentType[] = [
  "message",
  "post",
  "anon_question",
  "anon_answer",
  "diary",
  "checkin",
  "win",
  "feedback",
];

export type TimelineItem = {
  id: string;
  type: ContentType;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  /** Admin-panel link to open the item in context (when applicable). */
  linkPath: string | null;
};

export type TimelineFilter = {
  userId: string;
  types?: ContentType[];  // defaults to all
  limit?: number;          // safety cap; default 500 for listing, 10000 for export
  includeAssistantMessages?: boolean; // default false — "what THE USER wrote"
};

function combinePostText(p: {
  feeling: string | null;
  blocker: string | null;
  step: string | null;
  content: string | null;
}): string {
  const parts: string[] = [];
  if (p.feeling) parts.push(`Siento: ${p.feeling}`);
  if (p.blocker) parts.push(`Me frena: ${p.blocker}`);
  if (p.step) parts.push(`Mi paso: ${p.step}`);
  if (p.content) parts.push(p.content);
  return parts.join("\n\n");
}

export async function getUserContentTimeline(
  filter: TimelineFilter,
): Promise<TimelineItem[]> {
  const prisma = getPrismaClient();
  const { userId, types, limit = 500 } = filter;
  const includeAssistant = filter.includeAssistantMessages ?? false;

  const wants = (t: ContentType) => !types || types.includes(t);

  const tasks: Array<Promise<TimelineItem[]>> = [];

  if (wants("message")) {
    tasks.push(
      prisma.message
        .findMany({
          where: includeAssistant
            ? { userId }
            : { userId, role: "user" },
          select: {
            id: true,
            role: true,
            content: true,
            conversationId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((m) => ({
            id: m.id,
            type: "message" as const,
            content: m.content,
            metadata: { role: m.role, conversationId: m.conversationId },
            createdAt: m.createdAt,
            linkPath: `/admin/users/${userId}/conversations/${m.conversationId}`,
          })),
        ),
    );
  }

  if (wants("post")) {
    tasks.push(
      prisma.communityPost
        .findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            feeling: true,
            blocker: true,
            step: true,
            content: true,
            anonymous: true,
            spaceId: true,
            circleId: true,
            phase: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((p) => ({
            id: p.id,
            type: "post" as const,
            content: combinePostText(p),
            metadata: {
              postType: p.type,
              anonymous: p.anonymous,
              spaceId: p.spaceId,
              circleId: p.circleId,
              phase: p.phase,
            },
            createdAt: p.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  if (wants("anon_question")) {
    tasks.push(
      prisma.anonQuestion
        .findMany({
          where: { authorId: userId },
          select: {
            id: true,
            content: true,
            targetId: true,
            crisisDetected: true,
            hidden: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((q) => ({
            id: q.id,
            type: "anon_question" as const,
            content: q.content,
            metadata: {
              targetId: q.targetId,
              crisisDetected: q.crisisDetected,
              hidden: q.hidden,
            },
            createdAt: q.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  if (wants("anon_answer")) {
    tasks.push(
      prisma.anonAnswer
        .findMany({
          where: { userId },
          select: {
            id: true,
            content: true,
            questionId: true,
            anonymous: true,
            hidden: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((a) => ({
            id: a.id,
            type: "anon_answer" as const,
            content: a.content,
            metadata: {
              questionId: a.questionId,
              anonymous: a.anonymous,
              hidden: a.hidden,
            },
            createdAt: a.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  if (wants("diary")) {
    tasks.push(
      prisma.diaryEntry
        .findMany({
          where: { userId },
          select: {
            id: true,
            content: true,
            mood: true,
            tags: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((d) => ({
            id: d.id,
            type: "diary" as const,
            content: d.content,
            metadata: { mood: d.mood, tags: d.tags },
            createdAt: d.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  if (wants("checkin")) {
    tasks.push(
      prisma.dailyCheckin
        .findMany({
          where: { userId },
          select: {
            id: true,
            response: true,
            mood: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((c) => ({
            id: c.id,
            type: "checkin" as const,
            content: c.response,
            metadata: { mood: c.mood },
            createdAt: c.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  if (wants("win")) {
    tasks.push(
      prisma.win
        .findMany({
          where: { userId },
          select: {
            id: true,
            note: true,
            sharedWithFamily: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((w) => ({
            id: w.id,
            type: "win" as const,
            content: w.note,
            metadata: { sharedWithFamily: w.sharedWithFamily },
            createdAt: w.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  if (wants("feedback")) {
    tasks.push(
      prisma.feedback
        .findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            rating: true,
            message: true,
            page: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
        .then((rows) =>
          rows.map((f) => ({
            id: f.id,
            type: "feedback" as const,
            content: f.message,
            metadata: { feedbackType: f.type, rating: f.rating, page: f.page },
            createdAt: f.createdAt,
            linkPath: null,
          })),
        ),
    );
  }

  const chunks = await Promise.all(tasks);
  const all = chunks.flat();
  all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return all.slice(0, limit);
}

export function typeLabel(t: ContentType): string {
  switch (t) {
    case "message":       return "Mensaje";
    case "post":          return "Post comunidad";
    case "anon_question": return "Pregunta anónima";
    case "anon_answer":   return "Respuesta anónima";
    case "diary":         return "Diario";
    case "checkin":       return "Check-in";
    case "win":           return "Victoria";
    case "feedback":      return "Feedback";
  }
}
