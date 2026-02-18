"use client";

import { useState, useCallback } from "react";
import { EmberBackground } from "@/components/ui/EmberBackground";
import { PitchChat } from "@/components/pitch/PitchChat";
import { PitchFeed } from "@/components/pitch/PitchFeed";
import { useSWRConfig } from "swr";

export default function PitchPage() {
  const [activePitchId, setActivePitchId] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const handlePitchCreated = useCallback(
    (pitchId: string) => {
      setActivePitchId(pitchId);
      // Revalidate feed so the new pitch appears
      mutate((key: string) => typeof key === "string" && key.startsWith("pitch-feed"), undefined, { revalidate: true });
    },
    [mutate]
  );

  return (
    <div className="bg-obsidian min-h-screen relative">
      <EmberBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-6 pt-24 pb-8">
        <div className="mb-4">
          <h1 className="font-[var(--font-display)] text-xl text-torch-gold tracking-wider">
            Pitch
          </h1>
          <p className="text-[11px] text-stone mt-0.5">
            Convince Prometheus to invest in a token. Present your case with a nad.fun address.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "calc(100vh - 180px)" }}>
          <div className="lg:col-span-3">
            <PitchChat
              activePitchId={activePitchId}
              onPitchCreated={handlePitchCreated}
            />
          </div>
          <div className="lg:col-span-2">
            <PitchFeed
              selectedPitchId={activePitchId}
              onSelectPitch={setActivePitchId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
