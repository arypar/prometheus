import { prisma } from "../config/database";

export async function getAllTokens(filters?: {
  marketType?: string;
  held?: boolean;
  search?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.marketType && filters.marketType !== "ALL") {
    where.marketType = filters.marketType;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { symbol: { contains: filters.search, mode: "insensitive" } },
      { address: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.held) {
    where.holding = { isNot: null };
  }

  return prisma.token.findMany({
    where,
    include: { holding: true },
    orderBy: { discoveredAt: "desc" },
  });
}

export async function getTokenDetail(address: string) {
  const token = await prisma.token.findUnique({
    where: { address },
    include: {
      holding: true,
      transactions: { orderBy: { timestamp: "desc" }, take: 50 },
      priceSnapshots: { orderBy: { timestamp: "desc" }, take: 200 },
    },
  });

  return token;
}
