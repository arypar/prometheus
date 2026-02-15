"use client";

import { AgentSentiment } from "./AgentSentiment";
import { InvestmentCycle } from "./InvestmentCycle";

export function AgentInsights() {
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="font-[var(--font-display)] text-xl md:text-2xl text-torch-gold text-center mb-8">
        Agent Intelligence
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentSentiment />
        <InvestmentCycle />
      </div>
    </div>
  );
}
