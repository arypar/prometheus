"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, ExternalLink } from "lucide-react";
import { EmberBackground } from "@/components/ui/EmberBackground";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { AgentTerminal } from "@/components/dashboard/AgentTerminal";
import { AgentInsights } from "@/components/dashboard/AgentInsights";
import { usePortfolioOverview, useHoldings, useTransactions, useActivity } from "@/hooks/useData";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMON, formatPercent, shortenAddress, timeAgo } from "@/lib/utils";
import { EXPLORER_URL, API_BASE } from "@/lib/constants";
import type { BotAction } from "@/types";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function SectionDivider() {
  return <div className="divider-glyph" aria-hidden="true">&loz;</div>;
}

/* ── Hero (two-column: branding + terminal) ──────────── */
function HeroSection() {
  const { data: overview } = usePortfolioOverview();
  const { data: lastAction } = useActivity(1);
  const lastDecision = lastAction?.data?.[0];

  const miniStats = [
    {
      label: "Capital Deployed",
      value: overview ? `${formatMON(overview.totalInvested)} MON` : "—",
    },
    {
      label: "Active Investments",
      value: overview ? overview.activePositions.toString() : "—",
    },
    {
      label: "Last Decision",
      value: lastDecision ? `${lastDecision.action} ${timeAgo(lastDecision.timestamp)}` : "—",
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center smoke-gradient overflow-hidden">
      <EmberBackground />
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Left: Branding */}
        <div>
          <h1 className="font-[var(--font-display)] text-4xl md:text-6xl lg:text-7xl text-torch-gold leading-tight divine-breathe">
            Prometheus
          </h1>
          <p className="mt-6 text-lg md:text-xl text-stone font-[var(--font-heading)] max-w-xl">
            An autonomous AI venture capitalist, seeding and investing in tokens on the Monad blockchain. Profits fuel further investment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-8 py-3 bg-torch-gold/10 border border-torch-gold/30 text-torch-gold rounded-lg hover:bg-torch-gold/20 transition-colors text-sm tracking-wider"
            >
              <Flame className="w-4 h-4" />
              View Portfolio
            </Link>
            <Link
              href="/decisions"
              className="inline-flex items-center gap-2 px-8 py-3 border border-ash text-stone rounded-lg hover:text-ivory hover:border-stone/30 transition-colors text-sm tracking-wider"
            >
              View Decisions
            </Link>
          </div>
          {/* Mini stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {miniStats.map((s) => (
              <div key={s.label}>
                <p className="text-lg font-bold font-[var(--font-mono)] text-torch-gold">{s.value}</p>
                <p className="text-[10px] text-stone uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="lg:pl-4">
          <AgentTerminal />
        </div>
      </div>
    </section>
  );
}

/* ── Thesis ───────────────────────────────────────────── */
function ThesisSection() {
  const reveal = useScrollReveal();

  return (
    <section ref={reveal.ref} className={`py-16 px-6 ${reveal.visible ? "card-rise" : "opacity-0"}`}>
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 md:p-12">
          <h2 className="font-[var(--font-heading)] text-2xl md:text-3xl text-flame mb-6">
            What Prometheus Sees
          </h2>
          <div className="space-y-4 text-stone leading-relaxed">
            <p>
              Prometheus scans the Monad blockchain for newly launched tokens, evaluating each one
              through on-chain metrics — holder distribution, liquidity depth, trading volume
              patterns, and creator history.
            </p>
            <p>
              Tokens that pass evaluation receive a conviction score. When the score exceeds
              threshold, Prometheus invests — seeding promising projects with calculated sizing,
              then using earned fees to fuel further investments in a self-sustaining cycle.
            </p>
            <p>
              Every decision is logged, every trade is transparent. Prometheus operates with full
              autonomy and full accountability.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ── Agent Insights (Sentiment + Cycle) ──────────────── */
function AgentInsightsSection() {
  const reveal = useScrollReveal();

  return (
    <section ref={reveal.ref} className={`py-16 px-6 ${reveal.visible ? "card-rise" : "opacity-0"}`}>
      <AgentInsights />
    </section>
  );
}

/* ── Live Decision Feed ───────────────────────────────── */
function LiveDecisionFeedSection() {
  const { data } = useActivity(1);
  const [liveActions, setLiveActions] = useState<BotAction[]>([]);
  const reveal = useScrollReveal();

  const actionVariant: Record<string, "buy" | "sell" | "warning" | "error" | "default"> = {
    BUY: "buy",
    SELL: "sell",
    EVALUATE: "warning",
    ERROR: "error",
    SCAN: "default",
    SKIP: "default",
    THINK: "default",
  };

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/activity/live`);
    es.onmessage = (event) => {
      try {
        const action = JSON.parse(event.data) as BotAction;
        if (action.id) setLiveActions((prev) => [action, ...prev].slice(0, 20));
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  const allActions = [...liveActions, ...(data?.data || [])].slice(0, 8);

  return (
    <section ref={reveal.ref} className={`py-16 px-6 ${reveal.visible ? "card-rise" : "opacity-0"}`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-[var(--font-display)] text-xl text-torch-gold">Live Decisions</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-torch-gold pulse-glow" />
            <span className="text-[10px] text-torch-gold">LIVE</span>
          </div>
        </div>
        <Card className="p-0 overflow-hidden">
          {!allActions.length ? (
            <div className="p-8 text-center text-stone text-sm">Waiting for decisions...</div>
          ) : (
            <div className="divide-y divide-ash/30">
              {allActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 px-4 py-3">
                  <Badge variant={actionVariant[action.action] || "default"}>
                    {action.action}
                  </Badge>
                  <span className="text-sm text-ivory flex-1 min-w-0 truncate">
                    {action.reasoning || action.token?.symbol || (action.tokenAddress ? shortenAddress(action.tokenAddress) : "System")}
                  </span>
                  <span className="text-xs text-stone whitespace-nowrap">
                    {timeAgo(action.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="text-center mt-4">
          <Link href="/decisions" className="text-sm text-stone hover:text-torch-gold transition-colors">
            View all decisions &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Portfolio Grid ───────────────────────────────────── */
function PortfolioGridSection() {
  const { data: holdings, isLoading } = useHoldings();
  const reveal = useScrollReveal();

  return (
    <section ref={reveal.ref} className={`py-16 px-6 ${reveal.visible ? "card-rise" : "opacity-0"}`}>
      <div className="max-w-5xl mx-auto">
        <h2 className="font-[var(--font-display)] text-xl md:text-2xl text-torch-gold text-center mb-8">
          Holdings
        </h2>
        {isLoading ? (
          <LoadingState />
        ) : !holdings?.length ? (
          <p className="text-center text-stone text-sm">No active positions</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.slice(0, 6).map((h) => (
              <Link key={h.id} href={`/tokens/${h.tokenAddress}`}>
                <Card className="hover:border-torch-gold/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-ash flex items-center justify-center text-xs font-bold text-torch-gold">
                        {h.token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ivory">{h.token.symbol}</p>
                        <p className="text-[10px] text-stone">{h.token.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone">Value</span>
                    <span className="text-ivory font-[var(--font-mono)]">{formatMON(h.currentValue)} MON</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-stone">P&L</span>
                    <span className={`font-[var(--font-mono)] ${parseFloat(h.unrealizedPnl) >= 0 ? "text-torch-gold" : "text-prometheus-red"}`}>
                      {formatMON(h.unrealizedPnl)} ({formatPercent(h.roiPercent)})
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <div className="text-center mt-6">
          <Link href="/portfolio" className="text-sm text-stone hover:text-torch-gold transition-colors">
            View full portfolio &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Recent Trades ────────────────────────────────────── */
function RecentTradesSection() {
  const { data } = useTransactions(1, "ALL");
  const reveal = useScrollReveal();

  const txs = data?.data?.slice(0, 8) || [];

  return (
    <section ref={reveal.ref} className={`py-16 px-6 ${reveal.visible ? "card-rise" : "opacity-0"}`}>
      <div className="max-w-3xl mx-auto">
        <h2 className="font-[var(--font-display)] text-xl text-torch-gold text-center mb-8">
          Recent Trades
        </h2>
        {!txs.length ? (
          <p className="text-center text-stone text-sm">No trades yet</p>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-ash/30">
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={tx.type === "BUY" ? "buy" : "sell"}>{tx.type}</Badge>
                    <span className="text-sm text-ivory">{tx.token?.symbol || shortenAddress(tx.tokenAddress)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ivory font-[var(--font-mono)]">{formatMON(tx.monAmount)} MON</span>
                    <span className="text-xs text-stone">{timeAgo(tx.timestamp)}</span>
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
          </Card>
        )}
      </div>
    </section>
  );
}

/* ── Portfolio Chart ──────────────────────────────────── */
function PortfolioChartSection() {
  const reveal = useScrollReveal();

  return (
    <section ref={reveal.ref} className={`py-16 px-6 ${reveal.visible ? "card-rise" : "opacity-0"}`}>
      <div className="max-w-4xl mx-auto">
        <h2 className="font-[var(--font-display)] text-xl text-torch-gold text-center mb-8">
          Performance
        </h2>
        <PortfolioChart />
      </div>
    </section>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="bg-obsidian">
      <HeroSection />
      <SectionDivider />
      <ThesisSection />
      <SectionDivider />
      <AgentInsightsSection />
      <SectionDivider />
      <LiveDecisionFeedSection />
      <SectionDivider />
      <PortfolioGridSection />
      <SectionDivider />
      <RecentTradesSection />
      <SectionDivider />
      <PortfolioChartSection />
      <div className="py-16 text-center text-stone text-xs">
        <p className="font-[var(--font-heading)]">Prometheus &mdash; Autonomous AI Venture Capital</p>
      </div>
    </div>
  );
}
