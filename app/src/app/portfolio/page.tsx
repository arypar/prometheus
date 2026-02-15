"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useHoldings, usePortfolioOverview } from "@/hooks/useData";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/LoadingState";
import { formatMON, formatPercent, shortenAddress } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";

const COLORS = ["#F6C65B", "#FF8A3D", "#FFD87A", "#B21E2B", "#A7A397", "#2A3B3A"];

const TOOLTIP_STYLE = {
  backgroundColor: "#101116",
  border: "1px solid #23242B",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#F2F0E8",
};

export default function PortfolioPage() {
  const { data: overview, isLoading: overviewLoading } = usePortfolioOverview();
  const { data: holdings, isLoading: holdingsLoading, error } = useHoldings();

  if (error) return <ErrorState />;
  if (overviewLoading || holdingsLoading) return <div className="p-6"><LoadingState /></div>;

  const pieData = holdings?.map((h) => ({
    name: h.token.symbol,
    value: parseFloat(h.currentValue),
  })) || [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <h1 className="font-[var(--font-display)] text-2xl text-torch-gold">Portfolio</h1>

      {/* P&L Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-[10px] text-stone uppercase mb-1">Realized P&L</p>
          <p className={`text-lg font-bold font-[var(--font-mono)] ${parseFloat(overview?.realizedPnl || "0") >= 0 ? "text-torch-gold" : "text-prometheus-red"}`}>
            {formatMON(overview?.realizedPnl || "0")} MON
          </p>
        </Card>
        <Card>
          <p className="text-[10px] text-stone uppercase mb-1">Unrealized P&L</p>
          <p className={`text-lg font-bold font-[var(--font-mono)] ${parseFloat(overview?.unrealizedPnl || "0") >= 0 ? "text-torch-gold" : "text-prometheus-red"}`}>
            {formatMON(overview?.unrealizedPnl || "0")} MON
          </p>
        </Card>
        <Card>
          <p className="text-[10px] text-stone uppercase mb-1">Total P&L</p>
          <p className={`text-lg font-bold font-[var(--font-mono)] ${parseFloat(overview?.totalPnl || "0") >= 0 ? "text-torch-gold" : "text-prometheus-red"}`}>
            {formatMON(overview?.totalPnl || "0")} MON
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          {pieData.length === 0 ? (
            <EmptyState message="No holdings" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Holdings Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            {!holdings?.length ? (
              <EmptyState message="No active positions" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-stone text-[10px] uppercase border-b border-ash">
                      <th className="text-left py-2 pr-4">Token</th>
                      <th className="text-right py-2 pr-4">Amount</th>
                      <th className="text-right py-2 pr-4">Avg Buy</th>
                      <th className="text-right py-2 pr-4">Price</th>
                      <th className="text-right py-2 pr-4">Value</th>
                      <th className="text-right py-2 pr-4">P&L</th>
                      <th className="text-right py-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr key={h.id} className="border-b border-ash/30 hover:bg-charcoal/50">
                        <td className="py-2.5 pr-4">
                          <Link href={`/tokens/${h.tokenAddress}`} className="hover:text-torch-gold">
                            <span className="text-ivory font-medium">{h.token.symbol}</span>
                            <p className="text-[10px] text-stone">{shortenAddress(h.tokenAddress)}</p>
                          </Link>
                        </td>
                        <td className="text-right py-2.5 pr-4 text-ivory font-[var(--font-mono)]">{formatMON(h.amount)}</td>
                        <td className="text-right py-2.5 pr-4 text-stone font-[var(--font-mono)]">{formatMON(h.avgBuyPrice)}</td>
                        <td className="text-right py-2.5 pr-4 text-ivory font-[var(--font-mono)]">{formatMON(h.token.currentPrice)}</td>
                        <td className="text-right py-2.5 pr-4 text-ivory font-[var(--font-mono)]">{formatMON(h.currentValue)} MON</td>
                        <td className={`text-right py-2.5 pr-4 font-[var(--font-mono)] ${parseFloat(h.unrealizedPnl) >= 0 ? "text-torch-gold" : "text-prometheus-red"}`}>
                          {formatMON(h.unrealizedPnl)}
                        </td>
                        <td className="text-right py-2.5">
                          <Badge variant={h.roiPercent >= 0 ? "success" : "error"}>
                            {formatPercent(h.roiPercent)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
