"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTransactions } from "@/hooks/useData";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { formatMON, shortenAddress, timeAgo } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";
import { ExternalLink } from "lucide-react";

export function RecentTransactions() {
  const { data, isLoading } = useTransactions(1, "ALL");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>

      {isLoading ? (
        <LoadingState />
      ) : !data?.data?.length ? (
        <EmptyState message="No transactions yet" />
      ) : (
        <div className="space-y-2">
          {data.data.slice(0, 10).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2 border-b border-ash/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Badge variant={tx.type === "BUY" ? "buy" : "sell"}>
                  {tx.type}
                </Badge>
                <div>
                  <span className="text-xs text-ivory">
                    {tx.token?.symbol || shortenAddress(tx.tokenAddress)}
                  </span>
                  <p className="text-[10px] text-stone">{timeAgo(tx.timestamp)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ivory font-[var(--font-mono)]">{formatMON(tx.monAmount)} MON</span>
                <a
                  href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone hover:text-torch-gold"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
