"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { API_BASE } from "@/lib/constants";

type SSEListener = (data: unknown) => void;

interface SSEContextValue {
  subscribe: (listener: SSEListener) => () => void;
  connected: boolean;
}

const SSEContext = createContext<SSEContextValue | null>(null);

/**
 * Single SSE connection shared across all components.
 * Replaces the previous pattern where AgentTerminal, LiveFeed, and
 * DiscoveryToasts each opened their own EventSource.
 */
export function SSEProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<SSEListener>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/activity/live`);

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        for (const listener of listeners.current) {
          listener(data);
        }
      } catch {
        /* ignore parse errors */
      }
    };

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  const subscribe = useCallback((listener: SSEListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return (
    <SSEContext.Provider value={{ subscribe, connected }}>
      {children}
    </SSEContext.Provider>
  );
}

/**
 * Hook to subscribe to SSE events from the shared connection.
 * The callback is stable — wrap it in useCallback in the consumer.
 */
export function useSSE(onMessage: SSEListener) {
  const ctx = useContext(SSEContext);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!ctx) return;
    const handler: SSEListener = (data) => callbackRef.current(data);
    return ctx.subscribe(handler);
  }, [ctx]);

  return { connected: ctx?.connected ?? false };
}
