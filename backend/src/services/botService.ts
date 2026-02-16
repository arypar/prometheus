import crypto from "crypto";
import { supabase } from "../config/database";
import { BotActionPayload, BotTransactionPayload } from "../types";
import { sseClients } from "../routes/activity";

export async function logBotAction(payload: BotActionPayload) {
  const { data: action, error } = await supabase
    .from("BotAction")
    .insert({
      id: crypto.randomUUID(),
      action: payload.action,
      tokenAddress: payload.tokenAddress || null,
      details: payload.details || null,
      txHash: payload.txHash || null,
      reasoning: payload.reasoning || null,
      sentiment: payload.sentiment || null,
      confidence: payload.confidence ?? null,
      phase: payload.phase || null,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Broadcast to SSE clients
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(action)}\n\n`);
  }

  return action;
}

export async function recordTransaction(payload: BotTransactionPayload) {
  const { data: transaction, error: txErr } = await supabase
    .from("Transaction")
    .insert({
      id: crypto.randomUUID(),
      txHash: payload.txHash,
      tokenAddress: payload.tokenAddress,
      type: payload.type,
      monAmount: payload.monAmount,
      tokenAmount: payload.tokenAmount,
      price: payload.price,
      gasCost: payload.gasCost || "0",
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (txErr) throw txErr;

  // Update or create holding
  const { data: existingHolding } = await supabase
    .from("Holding")
    .select("*")
    .eq("tokenAddress", payload.tokenAddress)
    .maybeSingle();

  if (payload.type === "BUY") {
    if (existingHolding) {
      const newAmount = parseFloat(existingHolding.amount) + parseFloat(payload.tokenAmount);
      const newInvested = parseFloat(existingHolding.totalInvested) + parseFloat(payload.monAmount);
      const newAvgPrice = newInvested / newAmount;

      await supabase
        .from("Holding")
        .update({
          amount: newAmount.toString(),
          totalInvested: newInvested.toString(),
          avgBuyPrice: newAvgPrice.toString(),
        })
        .eq("tokenAddress", payload.tokenAddress);
    } else {
      const now = new Date().toISOString();
      await supabase.from("Holding").insert({
        id: crypto.randomUUID(),
        tokenAddress: payload.tokenAddress,
        amount: payload.tokenAmount,
        avgBuyPrice: payload.price,
        totalInvested: payload.monAmount,
        createdAt: now,
        updatedAt: now,
      });
    }
  } else if (payload.type === "SELL" && existingHolding) {
    const sellAmount = parseFloat(payload.tokenAmount);
    const remainingAmount = parseFloat(existingHolding.amount) - sellAmount;
    const costBasis = sellAmount * parseFloat(existingHolding.avgBuyPrice);
    const revenue = parseFloat(payload.monAmount);
    const realizedPnl = parseFloat(existingHolding.realizedPnl) + (revenue - costBasis);

    if (remainingAmount <= 0) {
      await supabase
        .from("Holding")
        .delete()
        .eq("tokenAddress", payload.tokenAddress);
    } else {
      await supabase
        .from("Holding")
        .update({
          amount: remainingAmount.toString(),
          realizedPnl: realizedPnl.toString(),
        })
        .eq("tokenAddress", payload.tokenAddress);
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
