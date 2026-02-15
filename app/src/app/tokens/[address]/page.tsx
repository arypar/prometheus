"use client";

import { use } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTokenDetail } from "@/hooks/useData";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/LoadingState";
import { formatMON, formatNumber, shortenAddress, timeAgo } from "@/lib/utils";
import { EXPLORER_URL, NAD_FUN_URL } from "@/lib/constants";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

const TOOLTIP_STYLE = {
  backgroundColor: "#101116",
  border: "1px solid #23242B",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#F2F0E8",
};

export default function TokenDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { data: token, isLoading, error } = useTokenDetail(address);

  if (error) return <ErrorState />;
  if (isLoading) return <div className="p-6"><LoadingState /></div>;
  if (!token) return <ErrorState message="Token not found" />;

  const priceData = token.priceSnapshots
    ?.slice()
    .reverse()
    .map((s) => ({
      time: new Date(s.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" }),
      price: parseFloat(s.price),
    }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <Link href="/tokens" className="inline-flex items-center gap-1.5 text-xs text-stone hover:text-torch-gold">
        <ArrowLeft className="w-3 h-3" />
        Back to tokens
      </Link>

      {/* Token Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-ash flex items-center justify-center text-sm font-bold text-torch-gold">
            {token.symbol.slice(0, 2)}
          </div>
          <div>
            <h1 className="font-[var(--font-display)] text-xl text-ivory">{token.symbol}</h1>
            <p className="text-xs text-stone">{token.name}</p>
          </div>
          <Badge variant="default">{token.marketType}</Badge>
        </div>
        <div className="flex gap-2">
          <a
            href={`${EXPLORER_URL}/token/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-[10px] rounded-lg border border-ash text-stone hover:text-ivory flex items-center gap-1.5"
          >
            Monadscan <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={`${NAD_FUN_URL}/token/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-[10px] rounded-lg border border-ash text-stone hover:text-ivory flex items-center gap-1.5"
          >
            nad.fun <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] text-stone uppercase">Price</p>
          <p className="text-sm font-bold text-ivory font-[var(--font-mono)]">{formatMON(token.currentPrice)} MON</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-stone uppercase">Market Cap</p>
          <p className="text-sm font-bold text-ivory font-[var(--font-mono)]">{formatNumber(token.marketCap)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-stone uppercase">Volume 24h</p>
          <p className="text-sm font-bold text-ivory font-[var(--font-mono)]">{formatNumber(token.volume24h)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-stone uppercase">Holders</p>
          <p className="text-sm font-bold text-ivory font-[var(--font-mono)]">{token.holderCount}</p>
        </Card>
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        {!priceData?.length ? (
          <EmptyState message="No price data yet" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8A3D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF8A3D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#A7A397" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#A7A397" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="price" stroke="#F6C65B" fill="url(#priceGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Position */}
        {token.holding && (
          <Card>
            <CardHeader>
              <CardTitle>Bot Position</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-stone">Amount</span>
                <span className="text-ivory font-[var(--font-mono)]">{formatMON(token.holding.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone">Avg Buy Price</span>
                <span className="text-ivory font-[var(--font-mono)]">{formatMON(token.holding.avgBuyPrice)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone">Invested</span>
                <span className="text-ivory font-[var(--font-mono)]">{formatMON(token.holding.totalInvested)} MON</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone">Current Value</span>
                <span className="text-torch-gold font-[var(--font-mono)]">
                  {formatMON(parseFloat(token.holding.amount) * parseFloat(token.currentPrice))} MON
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Trade History for this token */}
        <Card className={!token.holding ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>Trade History</CardTitle>
          </CardHeader>
          {!token.transactions?.length ? (
            <EmptyState message="No trades for this token" />
          ) : (
            <div className="space-y-2">
              {token.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-ash/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={tx.type === "BUY" ? "buy" : "sell"}>{tx.type}</Badge>
                    <span className="text-xs text-ivory font-[var(--font-mono)]">{formatMON(tx.monAmount)} MON</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-stone">{timeAgo(tx.timestamp)}</span>
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
      </div>
    </div>
  );
}
