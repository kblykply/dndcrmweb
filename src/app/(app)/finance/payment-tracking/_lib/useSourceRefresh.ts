"use client";

import { useEffect, useRef } from "react";
import type { PaymentSourceSnapshot } from "./types";

const MAX_POLLS = 10;
const MAX_POLL_WINDOW_MS = 60_000;
const MIN_DELAY_MS = 3_000;

/** A source refresh is shared by the backend; polling only reads its result. */
export function useSourceRefresh({
  freshness,
  enabled,
  scopeKey,
  onPoll,
}: {
  freshness: PaymentSourceSnapshot["freshness"] | undefined;
  enabled: boolean;
  scopeKey: string;
  onPoll: (signal: AbortSignal) => Promise<void>;
}) {
  const budget = useRef<{
    key: string;
    startedAt: number;
    attempts: number;
    delay: number;
  } | null>(null);
  const status = freshness?.status;
  const retryAfterMs = freshness?.retryAfterMs;
  useEffect(() => {
    if (status === "fresh") budget.current = null;
    if (
      !enabled ||
      (status !== "refreshing" && status !== "stale") ||
      retryAfterMs == null ||
      !Number.isFinite(retryAfterMs) ||
      retryAfterMs < 0
    )
      return;
    if (!budget.current || budget.current.key !== scopeKey)
      budget.current = {
        key: scopeKey,
        startedAt: Date.now(),
        attempts: 0,
        delay: MIN_DELAY_MS,
      };
    const current = budget.current;
    // A later response may ask for a slower retry, but never accelerate this cycle.
    current.delay = Math.max(current.delay, MIN_DELAY_MS, retryAfterMs);
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    function schedule() {
      if (
        disposed ||
        timer ||
        controller ||
        document.visibilityState !== "visible"
      )
        return;
      if (
        current.attempts >= MAX_POLLS ||
        Date.now() + current.delay > current.startedAt + MAX_POLL_WINDOW_MS
      )
        return;
      timer = setTimeout(async () => {
        timer = undefined;
        if (disposed || document.visibilityState !== "visible") return;
        current.attempts += 1;
        const pending = new AbortController();
        controller = pending;
        try {
          await onPoll(pending.signal);
        } finally {
          if (controller === pending) controller = null;
          schedule();
        }
      }, current.delay);
    }
    function visibilityChanged() {
      if (document.visibilityState === "visible") schedule();
      else {
        clearTimeout(timer);
        timer = undefined;
        controller?.abort();
      }
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    schedule();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [enabled, onPoll, retryAfterMs, scopeKey, status]);
}
