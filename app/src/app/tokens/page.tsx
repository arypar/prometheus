"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTokens } from "@/hooks/useData";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/LoadingState";
import { formatMON, formatNumber, shortenAddress, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { Search } from "lucide-react";

export default function TokensPage() {
  const [marketType, setMarketType] = useState("ALL");
  const [held, setHeld] = useState(false);
  const [search, setSearch] = useState("");
  const { data: tokens, isLoading, error } = useTokens({
    marketType: marketType === "ALL" ? undefined : marketType,
    held: held || undefined,
    search: search || undefined,
  });

  if (error) return <ErrorState />;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <h1 className="font-[var(--font-display)] text-2xl text-torch-gold">Discovered Tokens</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-charcoal border border-ash rounded-lg pl-9 pr-4 py-2 text-xs text-ivory placeholder:text-stone focus:outline-none focus:border-torch-gold/30"
          />
        </div>
        <div className="flex gap-1">
          {["ALL", "CURVE", "DEX"].map((t) => (
            <button
              key={t}
              onClick={() => setMarketType(t)}
              className={`px-3 py-1.5 text-[10px] rounded-lg border ${
                marketType === t
                  ? "border-torch-gold/30 bg-torch-gold/10 text-torch-gold"
                  : "border-ash text-stone hover:text-ivory"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHeld(!held)}
          className={`px-3 py-1.5 text-[10px] rounded-lg border ${
            held
              ? "border-ember/30 bg-ember/10 text-ember"
              : "border-ash text-stone hover:text-ivory"
          }`}
        >
          Bot Held
        </button>
      </div>

      {/* Token Grid */}
      {isLoading ? (
        <LoadingState />
      ) : !tokens?.length ? (
        <EmptyState message="No tokens found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((token) => (
            <Link key={token.address} href={`/tokens/${token.address}`}>
              <Card className="hover:border-torch-gold/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-ash flex items-center justify-center text-xs font-bold text-torch-gold">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ivory">{token.symbol}</p>
                      <p className="text-[10px] text-stone">{token.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default">{token.marketType}</Badge>
                    {token.holding && <Badge variant="buy">HELD</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <p className="text-stone uppercase">Price</p>
                    <p className="text-ivory font-[var(--font-mono)]">{formatMON(token.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-stone uppercase">Market Cap</p>
                    <p className="text-ivory font-[var(--font-mono)]">{formatNumber(token.marketCap)}</p>
                  </div>
                  <div>
                    <p className="text-stone uppercase">Volume 24h</p>
                    <p className="text-ivory font-[var(--font-mono)]">{formatNumber(token.volume24h)}</p>
                  </div>
                  <div>
                    <p className="text-stone uppercase">Holders</p>
                    <p className="text-ivory font-[var(--font-mono)]">{token.holderCount}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-stone font-[var(--font-mono)]">{shortenAddress(token.address)}</span>
                  <span className="text-stone">{timeAgo(token.discoveredAt)}</span>
                </div>

                {token.score !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-stone">Score</span>
                      <span className={token.score >= 70 ? "text-torch-gold" : token.score >= 40 ? "text-ember" : "text-prometheus-red"}>
                        {token.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-ash rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${token.score >= 70 ? "bg-torch-gold" : token.score >= 40 ? "bg-ember" : "bg-prometheus-red"}`}
                        style={{ width: `${token.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
