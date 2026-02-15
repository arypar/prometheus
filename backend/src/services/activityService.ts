import { prisma } from "../config/database";
import { PaginatedResponse } from "../types";
import { BotAction } from "@prisma/client";

export async function getActivityLog(
  page: number = 1,
  pageSize: number = 50,
  actionType?: string,
  tokenAddress?: string
): Promise<PaginatedResponse<BotAction>> {
  const where: Record<string, unknown> = {};

  if (actionType && actionType !== "ALL") {
    where.action = actionType;
  }

  if (tokenAddress) {
    where.tokenAddress = tokenAddress;
  }

  const [data, total] = await Promise.all([
    prisma.botAction.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        token: {
          select: {
            name: true,
            symbol: true,
            currentPrice: true,
            marketCap: true,
            volume24h: true,
            holderCount: true,
            score: true,
          },
        },
      },
    }),
    prisma.botAction.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
