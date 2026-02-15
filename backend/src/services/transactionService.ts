import { prisma } from "../config/database";
import { PaginatedResponse } from "../types";
import { Transaction } from "@prisma/client";

export async function getTransactions(
  page: number = 1,
  pageSize: number = 20,
  type?: string
): Promise<PaginatedResponse<Transaction>> {
  const where = type && type !== "ALL" ? { type: type as "BUY" | "SELL" } : {};

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { token: { select: { name: true, symbol: true, imageUrl: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
