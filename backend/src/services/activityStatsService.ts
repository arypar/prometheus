import { supabase } from "../config/database";
import { ActivityStats } from "../types";

export async function getActivityStats(): Promise<ActivityStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [totalRes, allActionsRes, todayBuysRes, todayEvalsRes, confRes, sentimentRes, phaseRes] =
    await Promise.all([
      supabase.from("BotAction").select("*", { count: "exact", head: true }),
      supabase.from("BotAction").select("action"),
      supabase
        .from("BotAction")
        .select("*", { count: "exact", head: true })
        .eq("action", "BUY")
        .gte("timestamp", todayISO),
      supabase
        .from("BotAction")
        .select("*", { count: "exact", head: true })
        .eq("action", "EVALUATE")
        .gte("timestamp", todayISO),
      supabase
        .from("BotAction")
        .select("confidence")
        .not("confidence", "is", null),
      supabase
        .from("BotAction")
        .select("sentiment")
        .not("sentiment", "is", null)
        .order("timestamp", { ascending: false })
        .limit(1),
      supabase
        .from("BotAction")
        .select("phase")
        .not("phase", "is", null)
        .order("timestamp", { ascending: false })
        .limit(1),
    ]);

  const totalActions = totalRes.count || 0;
  const todayBuys = todayBuysRes.count || 0;
  const todayEvaluations = todayEvalsRes.count || 0;

  const actionCounts: Record<string, number> = {};
  for (const row of allActionsRes.data || []) {
    actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
  }

  const confValues = (confRes.data || []).map((r) => r.confidence).filter((c) => c != null);
  const avgConfidence = confValues.length > 0
    ? confValues.reduce((a, b) => a + b, 0) / confValues.length
    : null;

  const currentSentiment = sentimentRes.data?.[0]?.sentiment || null;
  const currentPhase = phaseRes.data?.[0]?.phase || null;

  return {
    totalActions,
    actionCounts,
    todayBuys,
    todayEvaluations,
    avgConfidence,
    currentSentiment,
    currentPhase,
  };
}
