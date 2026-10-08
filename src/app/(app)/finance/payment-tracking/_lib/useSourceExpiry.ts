"use client";

import { useEffect, useRef } from "react";
import type { PaymentSourceSnapshot } from "./types";
import { isCurrentPaymentSource, sourceExpiresAt } from "./source-integrity";

/** Hide cached financial amounts when their freshness or local-day boundary expires. */
export function useSourceExpiry(source: Omit<PaymentSourceSnapshot, "cases"> | undefined, onExpired: () => void) {
  const callback = useRef(onExpired);
  useEffect(() => { callback.current = onExpired; }, [onExpired]);
  useEffect(() => {
    if (!source) return;
    const check = () => { if (!isCurrentPaymentSource(source)) callback.current(); };
    const expires = sourceExpiresAt(source);
    const deadline = window.setTimeout(check, Number.isFinite(expires) ? Math.max(0, expires - Date.now()) : 0);
    const midnight = window.setInterval(check, 1000);
    return () => { window.clearTimeout(deadline); window.clearInterval(midnight); };
  }, [source]);
}
