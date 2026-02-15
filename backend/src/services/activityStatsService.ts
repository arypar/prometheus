import { prisma } from "../config/database";
import { ActivityStats } from "../types";

export async function getActivityStats(): Promise<ActivityStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalActions, actionGroups, todayBuys, todayEvaluations, avgConfResult, latestWithSentiment, latestWithPhase] =
    await Promise.all([
      prisma.botAction.count(),
      prisma.botAction.groupBy({
        by: ["action"],
        _count: { action: true },
      }),
      prisma.botAction.count({
        where: { action: "BUY", timestamp: { gte: todayStart } },
      }),
      prisma.botAction.count({
        where: { action: "EVALUATE", timestamp: { gte: todayStart } },
      }),
      prisma.botAction.aggregate({
        _avg: { confidence: true },
        where: { confidence: { not: null } },
      }),
      prisma.botAction.findFirst({
        where: { sentiment: { not: null } },
        orderBy: { timestamp: "desc" },
        select: { sentiment: true },
      }),
      prisma.botAction.findFirst({
        where: { phase: { not: null } },
        orderBy: { timestamp: "desc" },
        select: { phase: true },
      }),
    ]);

  const actionCounts: Record<string, number> = {};
  for (const group of actionGroups) {
    actionCounts[group.action] = group._count.action;
  }

  return {
    totalActions,
    actionCounts,
    todayBuys,
    todayEvaluations,
    avgConfidence: avgConfResult._avg.confidence,
    currentSentiment: latestWithSentiment?.sentiment || null,
    currentPhase: latestWithPhase?.phase || null,
  };
}
