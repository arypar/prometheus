"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Flame, ExternalLink, ArrowUpRight, ArrowDownRight, Wallet, Copy, Check, Zap } from "lucide-react";
import { EmberBackground } from "@/components/ui/EmberBackground";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AgentTerminal } from "@/components/dashboard/AgentTerminal";
import { AgentSentiment } from "@/components/dashboard/AgentSentiment";
import { InvestmentCycle } from "@/components/dashboard/InvestmentCycle";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { NeuralCortex } from "@/components/dashboard/NeuralCortex";
import { usePortfolioOverview, useHoldings, useActivity, useActivityStats, useWalletInfo } from "@/hooks/useData";
import { useSSE } from "@/hooks/useSSE";
import { formatMON, formatPercent, shortenAddress, timeAgo } from "@/lib/utils";
import { EXPLORER_URL, WALLET_ADDRESS } from "@/lib/constants";
import type { BotAction } from "@/types";

/* ── Hero Banner ─────────────────────────────────────── */
function HeroBanner() {
  const { data: overview } = usePortfolioOverview();
  const { data: stats } = useActivityStats();
  const { data: wallet } = useWalletInfo();
  const [copied, setCopied] = useState(false);

  const portfolioVal = overview ? parseFloat(overview.totalValueMon) : 0;
  const totalPnl = overview ? parseFloat(overview.totalPnl) : 0;
  const isPnlPositive = totalPnl >= 0;
  const walletBalance = wallet ? parseFloat(wallet.balance) : overview ? parseFloat(overview.walletBalance) : 0;
  const displayAddress = wallet?.address || WALLET_ADDRESS;

  function handleCopy() {
    if (!displayAddress) return;
    navigator.clipboard.writeText(displayAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative card-rise">
      {/* Top: branding + wallet address */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <Flame className="w-8 h-8 text-torch-gold flame-flicker shrink-0" />
          <div>
            <h1 className="font-[var(--font-display)] text-2xl md:text-3xl text-torch-gold tracking-wider">
              Prometheus
            </h1>
            <p className="text-xs text-stone font-[var(--font-heading)] mt-0.5">
              Autonomous AI Venture Capital on Monad
            </p>
          </div>
        </div>
        {displayAddress && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-charcoal border border-ash/50 rounded-lg px-3 py-1.5">
              <Wallet className="w-3 h-3 text-torch-gold" />
              <span className="text-[11px] font-[var(--font-mono)] text-stone">
                {shortenAddress(displayAddress)}
              </span>
              <button onClick={handleCopy} className="text-stone hover:text-torch-gold transition-colors ml-1">
                {copied ? <Check className="w-3 h-3 text-torch-gold" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <a
              href={`${EXPLORER_URL}/address/${displayAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-charcoal border border-ash/50 rounded-lg px-2.5 py-1.5 text-stone hover:text-torch-gold hover:border-torch-gold/30 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="text-[10px]">Explorer</span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom: key stats row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div>
          <p className="text-[9px] text-stone uppercase tracking-wider">Wallet Balance</p>
          <p className="text-lg font-bold font-[var(--font-mono)] text-flame glow-text">
            <AnimatedNumber value={walletBalance} decimals={4} suffix=" MON" />
          </p>
        </div>
        <div className="w-px h-8 bg-ash/40 hidden md:block" />
        <div>
          <p className="text-[9px] text-stone uppercase tracking-wider">Portfolio Value</p>
          <p className="text-lg font-bold font-[var(--font-mono)] text-torch-gold glow-text">
            <AnimatedNumber value={portfolioVal} decimals={2} suffix=" MON" />
          </p>
        </div>
        <div className="w-px h-8 bg-ash/40 hidden md:block" />
        <div>
          <p className="text-[9px] text-stone uppercase tracking-wider">Total P&L</p>
          <p className={`text-lg font-bold font-[var(--font-mono)] flex items-center gap-1 ${isPnlPositive ? "text-torch-gold" : "text-prometheus-red"}`}>
            {isPnlPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <AnimatedNumber value={Math.abs(totalPnl)} decimals={2} prefix={isPnlPositive ? "+" : "-"} suffix=" MON" />
          </p>
        </div>
        <div className="w-px h-8 bg-ash/40 hidden md:block" />
        <div>
          <p className="text-[9px] text-stone uppercase tracking-wider">On-Chain Txns</p>
          <p className="text-lg font-bold font-[var(--font-mono)] text-stone">
            {wallet?.txCount ?? 0}
          </p>
        </div>
        <div className="w-px h-8 bg-ash/40 hidden md:block" />
        <div>
          <p className="text-[9px] text-stone uppercase tracking-wider">Actions Today</p>
          <p className="text-lg font-bold font-[var(--font-mono)] text-flame">
            {stats ? (stats.todayBuys + stats.todayEvaluations) : 0}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Live Decision Feed ──────────────────────────────── */
function LiveFeed() {
  const { data } = useActivity(1);
  const [liveActions, setLiveActions] = useState<BotAction[]>([]);

  const actionVariant: Record<string, "buy" | "sell" | "warning" | "error" | "default"> = {
    BUY: "buy",
    SELL: "sell",
    EVALUATE: "warning",
    ERROR: "error",
    SCAN: "default",
    SKIP: "default",
    THINK: "default",
  };

  const onSSEMessage = useCallback((data: unknown) => {
    const event = data as Record<string, unknown>;
    if (event.type === "PULSE" || event.type === "connected") return;
    const action = event as unknown as BotAction;
    if (action.id && action.action) setLiveActions((prev) => [action, ...prev].slice(0, 20));
  }, []);
  useSSE(onSSEMessage);

  const allActions = [...liveActions, ...(data?.data || [])].slice(0, 15);

  return (
    <Card variant="glow" className="flex flex-col h-full min-h-[420px] p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ash/50 bg-charcoal/80">
        <span className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)]">
          Live Decisions
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-torch-gold heartbeat" />
          <span className="text-[9px] text-torch-gold font-[var(--font-mono)] font-semibold">LIVE</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-ash/20">
        {!allActions.length ? (
          <div className="flex items-center justify-center h-full text-stone text-xs">
            Waiting for decisions...
          </div>
        ) : (
          allActions.map((action) => (
            <div key={action.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-ash/10 transition-colors">
              <Badge variant={actionVariant[action.action] || "default"}>
                {action.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-ivory truncate">
                  {action.token?.symbol || (action.tokenAddress ? shortenAddress(action.tokenAddress) : "System")}
                </p>
                {action.reasoning && (
                  <p className="text-[9px] text-stone truncate">{action.reasoning}</p>
                )}
              </div>
              <span className="text-[9px] text-stone whitespace-nowrap shrink-0">
                {timeAgo(action.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-ash/30 px-3 py-1.5 bg-charcoal/40 text-center">
        <Link href="/decisions" className="text-[10px] text-stone hover:text-torch-gold transition-colors">
          View all decisions &rarr;
        </Link>
      </div>
    </Card>
  );
}

/* ── Holdings Grid ───────────────────────────────────── */
function HoldingsGrid() {
  const { data: holdings } = useHoldings();

  if (!holdings?.length) {
    return (
      <Card className="p-4">
        <h3 className="text-[10px] text-stone uppercase tracking-wider mb-3">Holdings</h3>
        <p className="text-xs text-stone/60 text-center py-4">No active positions</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] text-stone uppercase tracking-wider">Holdings</h3>
        <Link href="/portfolio" className="text-[9px] text-stone hover:text-torch-gold transition-colors">
          View all &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {holdings.slice(0, 6).map((h) => {
          const pnl = parseFloat(h.unrealizedPnl);
          const isProfitable = pnl >= 0;
          return (
            <Link key={h.id} href={`/tokens/${h.tokenAddress}`}>
              <div className="glow-card border border-ash/40 rounded-lg p-2.5 hover:border-torch-gold/20 transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-1 ${isProfitable ? "bg-torch-gold/10 text-torch-gold ring-torch-gold/30" : "bg-prometheus-red/10 text-prometheus-red ring-prometheus-red/30"}`}>
                    {h.token.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ivory truncate group-hover:text-torch-gold transition-colors">{h.token.symbol}</p>
                    <p className="text-[9px] text-stone truncate">{h.token.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-stone">{formatMON(h.currentValue)}</span>
                  <span className={`font-[var(--font-mono)] font-semibold ${isProfitable ? "text-torch-gold" : "text-prometheus-red"}`}>
                    {formatPercent(h.roiPercent)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Discovery Toast Notifications ────────────────────── */
interface DiscoveryEvent {
  id: string;
  name: string;
  symbol: string;
  address: string;
  exiting: boolean;
}

function DiscoveryToasts() {
  const [toasts, setToasts] = useState<DiscoveryEvent[]>([]);
  const [flash, setFlash] = useState(false);
  const toastId = useRef(0);

  const addToast = useCallback((name: string, symbol: string, address: string) => {
    const id = `discovery-${toastId.current++}`;
    setToasts((prev) => [...prev.slice(-4), { id, name, symbol, address, exiting: false }]);

    setFlash(true);
    setTimeout(() => setFlash(false), 600);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 5000);
  }, []);

  const onSSEMessage = useCallback((data: unknown) => {
    const msg = data as { type?: string; token?: { name: string; symbol: string; address: string } };
    if (msg.type === "DISCOVERY" && msg.token) {
      addToast(msg.token.name, msg.token.symbol, msg.token.address);
    }
  }, [addToast]);
  useSSE(onSSEMessage);

  return (
    <>
      {/* Screen flash on discovery */}
      {flash && (
        <div className="fixed inset-0 z-[60] pointer-events-none lightning-flash bg-torch-gold/[0.03]" />
      )}

      {/* Toast stack */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto ${toast.exiting ? "toast-exit" : "toast-enter"}`}
          >
            <div className="flex items-center gap-3 bg-charcoal/95 backdrop-blur-md border border-torch-gold/20 rounded-lg px-4 py-3 shadow-[0_0_20px_rgba(246,198,91,0.1)]">
              <div className="w-8 h-8 rounded-full bg-torch-gold/10 border border-torch-gold/30 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-torch-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-torch-gold font-semibold uppercase tracking-wider">New Token Discovered</p>
                <p className="text-xs text-ivory font-medium truncate">{toast.name} ({toast.symbol})</p>
                <p className="text-[9px] text-stone font-[var(--font-mono)]">{shortenAddress(toast.address)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function HomePage() {
  const { data: overview } = usePortfolioOverview();

  return (
    <div className="bg-obsidian min-h-screen relative">
      <EmberBackground />
      <DiscoveryToasts />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-6 pt-24 pb-8">
        {/* Hero Banner */}
        <HeroBanner />

        {/* Stats Row */}
        {overview && (
          <div className="mt-5 card-rise stagger-1">
            <StatsGrid data={overview} />
          </div>
        )}

        {/* Terminal + Live Feed side-by-side */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 card-rise stagger-2">
            <AgentTerminal />
          </div>
          <div className="lg:col-span-2 card-rise stagger-3">
            <LiveFeed />
          </div>
        </div>

        {/* Neural Cortex — live system activity */}
        <div className="mt-4 card-rise stagger-4">
          <NeuralCortex />
        </div>

        {/* Sentiment + Pipeline + Holdings */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-rise stagger-5">
            <AgentSentiment />
          </div>
          <div className="card-rise stagger-6">
            <InvestmentCycle />
          </div>
          <div className="card-rise stagger-6">
            <HoldingsGrid />
          </div>
        </div>

        {/* Performance Chart */}
        <div className="mt-4 card-rise">
          <PortfolioChart />
        </div>

        {/* Footer */}
        <div className="mt-6 py-4 text-center text-stone text-[10px] border-t border-ash/20">
          <p className="font-[var(--font-heading)]">Prometheus &mdash; Autonomous AI Venture Capital on Monad</p>
        </div>
      </div>
    </div>
  );
}
