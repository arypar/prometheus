"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, ExternalLink, Flame } from "lucide-react";

const TELEGRAM_URL = "https://t.me/prometheus_monad_bot";

export function TelegramPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Popup card */}
      {open && (
        <div className="telegram-popup-enter w-[300px] bg-charcoal/95 backdrop-blur-md border border-ash/60 rounded-xl shadow-[0_0_30px_rgba(246,198,91,0.08)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ash/40 bg-obsidian/60">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-torch-gold flame-flicker" />
              <span className="text-xs font-[var(--font-display)] text-torch-gold tracking-wider">
                PROMETHEUS
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-stone hover:text-ivory transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            <p className="text-sm text-ivory leading-relaxed">
              Speak directly to <span className="text-torch-gold font-semibold">Prometheus</span> on Telegram.
            </p>
            <p className="text-[11px] text-stone mt-1.5 leading-relaxed">
              Ask questions, get alpha, or just vibe with the autonomous AI VC.
            </p>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full bg-torch-gold/10 hover:bg-torch-gold/20 border border-torch-gold/30 hover:border-torch-gold/50 text-torch-gold rounded-lg px-4 py-2.5 transition-all group"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              <span className="text-xs font-semibold tracking-wide">
                @prometheus_monad_bot
              </span>
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      )}

      {/* Floating action button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`telegram-fab group relative w-12 h-12 rounded-full bg-torch-gold/15 border border-torch-gold/40 hover:bg-torch-gold/25 hover:border-torch-gold/60 transition-all shadow-[0_0_20px_rgba(246,198,91,0.12)] hover:shadow-[0_0_30px_rgba(246,198,91,0.2)] ${
          mounted ? "telegram-fab-enter" : "opacity-0 scale-75"
        } ${open ? "rotate-0" : ""}`}
        aria-label="Speak to Prometheus on Telegram"
      >
        {open ? (
          <X className="w-5 h-5 text-torch-gold mx-auto" />
        ) : (
          <MessageCircle className="w-5 h-5 text-torch-gold mx-auto" />
        )}

        {/* Ping ring when closed */}
        {!open && mounted && (
          <span className="absolute inset-0 rounded-full border border-torch-gold/30 telegram-ping" />
        )}
      </button>
    </div>
  );
}
