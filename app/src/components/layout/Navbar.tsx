"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Flame, ExternalLink } from "lucide-react";
import { EXPLORER_URL, WALLET_ADDRESS } from "@/lib/constants";
import { shortenAddress } from "@/lib/utils";

const navLinks = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/decisions", label: "Decisions" },
  { href: "/tokens", label: "Tokens" },
  { href: "/analytics", label: "Analytics" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-obsidian/80 backdrop-blur-md border-b border-ash/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Branding */}
          <Link href="/" className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-torch-gold flame-flicker" />
            <span className="font-[var(--font-display)] text-torch-gold text-sm tracking-[0.2em] font-bold">
              PROMETHEUS
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors relative pb-1 ${
                    isActive
                      ? "text-torch-gold"
                      : "text-stone hover:text-ivory"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-torch-gold" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Wallet address pill */}
          {WALLET_ADDRESS && (
            <a
              href={`${EXPLORER_URL}/address/${WALLET_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 bg-ash/30 border border-ash/50 rounded-full px-3 py-1 text-stone hover:text-torch-gold hover:border-torch-gold/30 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-torch-gold/60" />
              <span className="text-[10px] font-[var(--font-mono)]">{shortenAddress(WALLET_ADDRESS)}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-stone hover:text-ivory"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden bg-charcoal border-b border-ash">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block text-sm py-2 ${
                    isActive ? "text-torch-gold" : "text-stone hover:text-ivory"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
