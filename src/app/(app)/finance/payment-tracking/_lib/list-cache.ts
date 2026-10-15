import {
  AUTH_SESSION_CHANGED_EVENT,
  getAccessToken,
  getAuthSessionVersion,
  getUser,
} from "@/lib/auth";
import type { PaymentTrackingList } from "./types";
import { hasProjectGroupContract } from "./project-groups";
import { hasCurrencyContract } from "./list-currencies";
import { hasSourceAudit } from "./source-integrity";
import { hasInvoiceOkContract } from "./invoice-ok";

const CACHE_TTL_MS = 30_000;
const SOURCE_MAX_AGE_MS = 300_000;
const MAX_ENTRIES = 12;
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Famagusta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
type CacheTicket = {
  session: string | null;
  identity: string;
  generation: number;
  audience?: "finance" | "sales";
};
type Entry = { value: PaymentTrackingList; receivedAt: number };

// Financial responses stay in memory and are never persisted in browser storage.
const entries = new Map<string, Entry>();
let session: string | null = null;
let generation = 0;

export function invalidatePaymentListCache() {
  entries.clear();
  generation += 1;
}

export function paymentListCacheTicket(
  audience: "finance" | "sales" = "finance",
): CacheTicket {
  const user = getUser();
  const token = getAccessToken();
  const identity = JSON.stringify([
    user?.id,
    user?.role,
    user?.originalRole,
    !!user?.isPreview,
    getAuthSessionVersion(),
  ]);
  const next =
    token &&
    user?.id &&
    (audience === "sales" ? ["SALES"] : ["ADMIN", "ACCOUNTING"]).includes(
      user.role,
    ) &&
    user.originalRole !== "PREVIEW" &&
    !user.isPreview
      ? JSON.stringify([identity, token])
      : null;
  if (next !== session) {
    invalidatePaymentListCache();
    session = next;
  }
  return {
    session,
    identity,
    generation,
    ...(audience === "sales" ? { audience } : {}),
  };
}

function current(ticket: CacheTicket): boolean {
  const latest = paymentListCacheTicket(ticket.audience);
  return (
    !!ticket.session &&
    ticket.session === latest.session &&
    ticket.generation === latest.generation
  );
}

function usable(value: PaymentTrackingList, now: number): boolean {
  const generatedAt = Date.parse(value.source.generatedAt);
  const declaredAge = value.source.freshness?.maxAgeSeconds;
  const maxAge =
    declaredAge != null && Number.isFinite(declaredAge)
      ? Math.min(SOURCE_MAX_AGE_MS, Math.max(0, declaredAge * 1000))
      : SOURCE_MAX_AGE_MS;
  return (
    hasSourceAudit(value.source, now) &&
    hasCurrencyContract(value) &&
    hasProjectGroupContract(value) &&
    hasInvoiceOkContract(value, value.rows) &&
    typeof value.summary?.closedCount === "number" &&
    typeof value.filteredSummary?.closedCount === "number" &&
    value.rows.every((row) => typeof row.fullyPaid === "boolean") &&
    value.source.asOf === today.format(now) &&
    Number.isFinite(generatedAt) &&
    generatedAt <= now + 5_000 &&
    now - generatedAt < maxAge &&
    value.source.freshness?.status !== "stale"
  );
}

export function isPaymentListSourceRecent(value: PaymentTrackingList): boolean {
  const now = Date.now();
  return (
    usable(value, now) &&
    now - Date.parse(value.source.generatedAt) < CACHE_TTL_MS
  );
}

export function readPaymentListCache(
  key: string,
  ticket: CacheTicket,
): PaymentTrackingList | null {
  if (!current(ticket)) return null;
  const entry = entries.get(key);
  if (!entry) return null;
  const now = Date.now();
  const age = now - entry.receivedAt;
  if (
    age < 0 ||
    age >= CACHE_TTL_MS ||
    !usable(entry.value, now) ||
    !hasCurrencyContract(
      entry.value,
      new URLSearchParams(key).get("currency") ?? "",
    ) ||
    !hasInvoiceOkContract(
      entry.value,
      entry.value.rows,
      new URLSearchParams(key).get("invoiceOk") ?? "all",
    )
  ) {
    entries.delete(key);
    return null;
  }
  return {
    ...entry.value,
    source: {
      ...entry.value.source,
      freshness: {
        status: "refreshing",
        retryAfterMs: null,
        maxAgeSeconds: entry.value.source.freshness?.maxAgeSeconds ?? 300,
      },
    },
  };
}

export function writePaymentListCache(
  key: string,
  value: PaymentTrackingList,
  ticket: CacheTicket,
) {
  if (!current(ticket)) return;
  entries.delete(key);
  if (
    !usable(value, Date.now()) ||
    !hasCurrencyContract(
      value,
      new URLSearchParams(key).get("currency") ?? "",
    ) ||
    !hasInvoiceOkContract(
      value,
      value.rows,
      new URLSearchParams(key).get("invoiceOk") ?? "all",
    )
  )
    return;
  entries.set(key, { value, receivedAt: Date.now() });
  while (entries.size > MAX_ENTRIES)
    entries.delete(entries.keys().next().value!);
}

export function removePaymentListCache(key: string, ticket: CacheTicket) {
  if (current(ticket)) entries.delete(key);
}

if (typeof window !== "undefined") {
  window.addEventListener(
    AUTH_SESSION_CHANGED_EVENT,
    invalidatePaymentListCache,
  );
  window.addEventListener("storage", (event) => {
    if (
      !event.key ||
      ["user", "accessToken", "refreshToken"].includes(event.key)
    )
      invalidatePaymentListCache();
  });
}
