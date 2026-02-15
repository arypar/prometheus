"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useActivity } from "@/hooks/useData";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { timeAgo, shortenAddress } from "@/lib/utils";
import { API_BASE } from "@/lib/constants";
import type { BotAction } from "@/types";

const actionVariant: Record<string, "buy" | "sell" | "success" | "error" | "warning" | "default"> = {
  BUY: "buy",
  SELL: "sell",
  SCAN: "default",
  EVALUATE: "warning",
  SKIP: "default",
  ERROR: "error",
};

export function ActivityFeed() {
  const { data, isLoading } = useActivity(1);
  const [liveActions, setLiveActions] = useState<BotAction[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/activity/live`);

    eventSource.onmessage = (event) => {
      try {
        const action = JSON.parse(event.data) as BotAction;
        if (action.id) {
          setLiveActions((prev) => [action, ...prev].slice(0, 20));
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => eventSource.close();
  }, []);

  const allActions = [...liveActions, ...(data?.data || [])].slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Decision Feed</CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-torch-gold pulse-glow" />
            <span className="text-[10px] text-torch-gold">LIVE</span>
          </div>
        </div>
      </CardHeader>

      {isLoading && !liveActions.length ? (
        <LoadingState />
      ) : !allActions.length ? (
        <EmptyState message="No activity yet" />
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {allActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-3 py-1.5 border-b border-ash/30 last:border-0"
            >
              <Badge variant={actionVariant[action.action] || "default"}>
                {action.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-ivory">
                  {action.token?.symbol || (action.tokenAddress ? shortenAddress(action.tokenAddress) : "System")}
                </span>
              </div>
              <span className="text-[10px] text-stone whitespace-nowrap">
                {timeAgo(action.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
