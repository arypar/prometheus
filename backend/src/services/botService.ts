import { prisma } from "../config/database";
import { BotActionPayload, BotTransactionPayload } from "../types";
import { sseClients } from "../routes/activity";

export async function logBotAction(payload: BotActionPayload) {
  const action = await prisma.botAction.create({
    data: {
      action: payload.action,
      tokenAddress: payload.tokenAddress || null,
      details: (payload.details as any) || undefined,
      txHash: payload.txHash || null,
      reasoning: payload.reasoning || null,
      sentiment: payload.sentiment || null,
      confidence: payload.confidence ?? null,
      phase: payload.phase || null,
    },
  });

  // Broadcast to SSE clients
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(action)}\n\n`);
  }

  return action;
}

export async function recordTransaction(payload: BotTransactionPayload) {
  // Create the transaction record
  const transaction = await prisma.transaction.create({
    data: {
      txHash: payload.txHash,
      tokenAddress: payload.tokenAddress,
      type: payload.type,
      monAmount: payload.monAmount,
      tokenAmount: payload.tokenAmount,
      price: payload.price,
      gasCost: payload.gasCost || "0",
    },
  });

  // Update or create holding
  const existingHolding = await prisma.holding.findUnique({
    where: { tokenAddress: payload.tokenAddress },
  });

  if (payload.type === "BUY") {
    if (existingHolding) {
      const newAmount = parseFloat(existingHolding.amount) + parseFloat(payload.tokenAmount);
      const newInvested = parseFloat(existingHolding.totalInvested) + parseFloat(payload.monAmount);
      const newAvgPrice = newInvested / newAmount;

      await prisma.holding.update({
        where: { tokenAddress: payload.tokenAddress },
        data: {
          amount: newAmount.toString(),
          totalInvested: newInvested.toString(),
          avgBuyPrice: newAvgPrice.toString(),
        },
      });
    } else {
      await prisma.holding.create({
        data: {
          tokenAddress: payload.tokenAddress,
          amount: payload.tokenAmount,
          avgBuyPrice: payload.price,
          totalInvested: payload.monAmount,
        },
      });
    }
  } else if (payload.type === "SELL" && existingHolding) {
    const sellAmount = parseFloat(payload.tokenAmount);
    const remainingAmount = parseFloat(existingHolding.amount) - sellAmount;
    const costBasis = sellAmount * parseFloat(existingHolding.avgBuyPrice);
    const revenue = parseFloat(payload.monAmount);
    const realizedPnl = parseFloat(existingHolding.realizedPnl) + (revenue - costBasis);

    if (remainingAmount <= 0) {
      await prisma.holding.delete({
        where: { tokenAddress: payload.tokenAddress },
      });
    } else {
      await prisma.holding.update({
        where: { tokenAddress: payload.tokenAddress },
        data: {
          amount: remainingAmount.toString(),
          realizedPnl: realizedPnl.toString(),
        },
      });
    }
  }

  // Log the bot action too
  await logBotAction({
    action: payload.type,
    tokenAddress: payload.tokenAddress,
    txHash: payload.txHash,
    details: { monAmount: payload.monAmount, tokenAmount: payload.tokenAmount, price: payload.price },
  });

  return transaction;
}
