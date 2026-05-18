"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import LeadAvatar from "../../_ui/LeadAvatar";
import { useLanguage } from "@/app/_ui/LanguageProvider";

const STATUSES = [
  "ALL",
  "NEW",
  "WORKING",
  "SALES_READY",
  "MANAGER_REVIEW",
  "ASSIGNED",
  "WON",
  "LOST",
] as const;

const OUTCOMES = [
  { key: "OPENED", labelKey: "leadOutcomes.OPENED", fallback: "Opened / Connected" },
  { key: "NO_ANSWER", labelKey: "leadOutcomes.NO_ANSWER", fallback: "No answer" },
  { key: "BUSY", labelKey: "leadOutcomes.BUSY", fallback: "Busy" },
  { key: "UNREACHABLE", labelKey: "leadOutcomes.UNREACHABLE", fallback: "Unreachable" },
  { key: "CALL_AGAIN", labelKey: "leadOutcomes.CALL_AGAIN", fallback: "Call again" },
  { key: "INTERESTED", labelKey: "leadOutcomes.INTERESTED", fallback: "Interested" },
  { key: "NOT_INTERESTED", labelKey: "leadOutcomes.NOT_INTERESTED", fallback: "Not interested" },
  { key: "QUALIFIED", labelKey: "leadOutcomes.QUALIFIED", fallback: "Qualified" },
  { key: "WON", labelKey: "leadOutcomes.WON", fallback: "Won" },
  { key: "LOST", labelKey: "leadOutcomes.LOST", fallback: "Lost" },
  { key: "WRONG_NUMBER", labelKey: "leadOutcomes.WRONG_NUMBER", fallback: "Wrong number" },
] as const;

const INTEREST_FILTERS = [
  { key: "active", labelKey: "leads.interest.active", fallback: "Active leads" },
  {
    key: "notInterested",
    labelKey: "leads.interest.notInterested",
    fallback: "Not interested",
  },
  { key: "all", labelKey: "leads.interest.all", fallback: "All leads" },
] as const;

type LeadRow = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: string;
  nextFollowUpAt?: string | null;
  lastActivityAt?: string | null;
  avatarUrl?: string | null;
};

function normalizePhoneForWa(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function toDatetimeLocal(hoursFromNow: number) {
  const dt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours(),
  )}:${pad(dt.getMinutes())}`;
}

function followTone(nextFollowUpAt?: string | null) {
  if (!nextFollowUpAt) return "none" as const;

  const now = Date.now();
  const t = new Date(nextFollowUpAt).getTime();

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  if (t < now) return "danger" as const;
  if (t >= startToday.getTime() && t <= endToday.getTime()) return "warning" as const;

  const week = now + 7 * 24 * 60 * 60 * 1000;
  if (t <= week) return "info" as const;

  return "none" as const;
}

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function formatFollowText(
  nextFollowUpAt: string | null | undefined,
  locale: "tr" | "en",
  t: (path: string) => string,
) {
  if (!nextFollowUpAt) return t("leads.noFollowUp");
  return new Date(nextFollowUpAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

function normalizeErrorMessage(
  input: unknown,
  t: (path: string) => string,
  locale: "tr" | "en",
) {
  const text = String(input || "");

  if (
    text.includes("Internal server error") ||
    text.includes('"statusCode":500') ||
    text.includes("P2028") ||
    text.includes("Unable to start a transaction in the given time") ||
    text.includes("Transaction API error")
  ) {
    return locale === "tr"
      ? "Sunucuda geçici bir yoğunluk oluştu. Lütfen tekrar deneyin."
      : "The server is temporarily busy. Please try again.";
  }

  if (text.includes("Unauthorized")) {
    return locale === "tr" ? "Oturum süresi doldu." : "Your session has expired.";
  }

  if (text.includes("fullName is required")) {
    return locale === "tr" ? "Ad soyad zorunludur." : "Full name is required.";
  }

  if (text.includes("phone is required")) {
    return locale === "tr" ? "Telefon zorunludur." : "Phone is required.";
  }

  if (text.includes("summary is required")) {
    return locale === "tr" ? "Özet zorunludur." : "Summary is required.";
  }

  if (text.includes("Invalid nextFollowUpAt")) {
    return locale === "tr" ? "Geçersiz takip tarihi." : "Invalid follow-up date.";
  }

  return text;
}

export default function LeadsPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUSES)[number]>("ALL");
  const [interestFilter, setInterestFilter] =
    useState<(typeof INTEREST_FILTERS)[number]["key"]>("active");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Website");

  const [followById, setFollowById] = useState<Record<string, string>>({});
  const [outcomeById, setOutcomeById] = useState<Record<string, string>>({});
  const [callNoteById, setCallNoteById] = useState<Record<string, string>>({});
  const [savingCallId, setSavingCallId] = useState<string | null>(null);
  const [savingFollowId, setSavingFollowId] = useState<string | null>(null);

  const canCreate = me?.role === "CALLCENTER" || me?.role === "ADMIN";

  async function load(
    nextPage = page,
    nextStatus = statusFilter,
    nextQ = q,
    nextPageSize = pageSize,
    nextInterest = interestFilter,
  ) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (nextStatus !== "ALL") params.set("status", nextStatus);
      if (nextQ.trim()) params.set("q", nextQ.trim());
      params.set("interest", nextInterest);

      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));

      const res = await authedFetch(`/leads?${params.toString()}`);
      const items = Array.isArray(res?.items) ? res.items : [];

      setLeads(items);
      setTotal(Number(res?.total || 0));
      setTotalPages(Math.max(1, Number(res?.totalPages || 1)));
      setPage(Number(res?.page || nextPage));
      setPageSize(Number(res?.pageSize || nextPageSize));

      setFollowById((prev) => {
        const next = { ...prev };
        for (const l of items) {
          if (next[l.id] === undefined) next[l.id] = "";
        }
        return next;
      });

      setOutcomeById((prev) => {
        const next = { ...prev };
        for (const l of items) {
          if (next[l.id] === undefined) next[l.id] = "NO_ANSWER";
        }
        return next;
      });

      setCallNoteById((prev) => {
        const next = { ...prev };
        for (const l of items) {
          if (next[l.id] === undefined) next[l.id] = "";
        }
        return next;
      });
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t, locale));
    } finally {
      setLoading(false);
    }
  }

  async function createLead() {
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanSource = source.trim();

    if (!cleanFullName || !cleanPhone) {
      setErr(
        locale === "tr"
          ? "Ad soyad ve telefon zorunludur."
          : "Full name and phone are required.",
      );
      return;
    }

    setErr(null);

    try {
      await authedFetch("/leads", {
        method: "POST",
        body: JSON.stringify({
          fullName: cleanFullName,
          phone: cleanPhone,
          source: cleanSource || undefined,
        }),
      });

      setFullName("");
      setPhone("");
      setSource("Website");
      setShowCreate(false);

      await load(1, statusFilter, q, pageSize, interestFilter);
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t, locale));
    }
  }

  async function saveOutcome(leadId: string) {
    setErr(null);
    setSavingCallId(leadId);

    try {
      const outcome = outcomeById[leadId] || "NO_ANSWER";
      const note = (callNoteById[leadId] || "").trim();

      const body: any = {
        type: "CALL",
        callOutcome: outcome,
        summary: `${t("leads.callSummary")}: ${safeTranslate(
          t,
          `leadOutcomes.${outcome}`,
          outcome,
        )}`,
      };

      if (note) {
        body.details = note;
      }

      await authedFetch(`/leads/${leadId}/activity`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setCallNoteById((p) => ({ ...p, [leadId]: "" }));
      await load(page, statusFilter, q, pageSize, interestFilter);
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t, locale));
    } finally {
      setSavingCallId(null);
    }
  }

  async function saveFollowUp(leadId: string) {
    setErr(null);
    setSavingFollowId(leadId);

    try {
      const followLocal = followById[leadId] || "";

      if (!followLocal) {
        throw new Error(
          locale === "tr" ? "Takip tarihi seçin." : "Select a follow-up date.",
        );
      }

      const parsed = new Date(followLocal);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(locale === "tr" ? "Geçersiz takip tarihi." : "Invalid follow-up date.");
      }

      await authedFetch(`/leads/${leadId}/follow-up`, {
        method: "PATCH",
        body: JSON.stringify({ nextFollowUpAt: parsed.toISOString() }),
      });

      setFollowById((p) => ({ ...p, [leadId]: "" }));
      await load(page, statusFilter, q, pageSize, interestFilter);
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t, locale));
    } finally {
      setSavingFollowId(null);
    }
  }

  function preset(leadId: string, hours: number) {
    setFollowById((p) => ({ ...p, [leadId]: toDatetimeLocal(hours) }));
  }

  function runSearch() {
    const nextQ = searchInput.trim();
    setQ(nextQ);
    setPage(1);
    load(1, statusFilter, nextQ, pageSize, interestFilter);
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load(1, statusFilter, q, pageSize, interestFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    setPage(1);
    load(1, statusFilter, q, pageSize, interestFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, interestFilter, pageSize]);

  const pageInfoText = useMemo(() => {
    if (!total) return t("common.noRecords");
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} / ${total}`;
  }, [page, pageSize, total, t]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("leads.label")}
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900 }}>{t("leads.title")}</div>
            <span className="badge" style={{ fontWeight: 800 }}>
              {total} {t("leads.leadCount")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={canCreate ? "primary" : ""}
            disabled={!canCreate}
          >
            {showCreate ? t("common.close") : t("leads.newLead")}
          </button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--stroke)", display: "flex", gap: 18 }}>
        <Link
          href="/leads"
          style={{
            padding: "12px 2px",
            fontWeight: 800,
            borderBottom: "2px solid var(--text-primary)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          {t("leads.title")}
        </Link>

        <span
          style={{
            padding: "12px 2px",
            fontWeight: 700,
            color: "var(--text-secondary)",
          }}
        >
          {t("leads.referencePartners")}
        </span>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>{t("leads.createTitle")}</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: 10,
            }}
          >
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("leads.fields.fullName")}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("leads.fields.phone")}
            />
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("leads.fields.source")}
            />
            <button
              className="primary"
              onClick={createLead}
              disabled={!fullName.trim() || !phone.trim()}
            >
              {t("common.create")}
            </button>
          </div>

          {err ? <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre> : null}
        </div>
      ) : null}

      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px,1fr) 220px 220px 130px auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("leads.searchPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof STATUSES)[number])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL"
                  ? t("leads.allStatuses")
                  : safeTranslate(t, `leadStatuses.${s}`, s)}
              </option>
            ))}
          </select>

          <select
            value={interestFilter}
            onChange={(e) =>
              setInterestFilter(
                e.target.value as (typeof INTEREST_FILTERS)[number]["key"],
              )
            }
          >
            {INTEREST_FILTERS.map((item) => (
              <option key={item.key} value={item.key}>
                {safeTranslate(t, item.labelKey, item.fallback)}
              </option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={25}>25 / {t("agencies.perPage")}</option>
            <option value={50}>50 / {t("agencies.perPage")}</option>
            <option value={100}>100 / {t("agencies.perPage")}</option>
          </select>

          <button onClick={runSearch} disabled={loading}>
            {loading ? t("common.loading") : t("common.search")}
          </button>
        </div>

        {err ? (
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{err}</pre>
        ) : null}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input type="checkbox" readOnly />
              </th>
              <th>{t("leads.table.name")}</th>
              <th>{t("leads.table.contact")}</th>
              <th>{t("leads.table.status")}</th>
              <th style={{ width: 260 }}>{t("leads.table.followUp")}</th>
              <th style={{ width: 300 }}>{t("leads.table.callResult")}</th>
              <th style={{ width: 120 }}>{t("leads.table.save")}</th>
            </tr>
          </thead>

          <tbody>
            {leads.map((l) => {
              const tone = followTone(l.nextFollowUpAt);
              const savingCall = savingCallId === l.id;
              const savingFollow = savingFollowId === l.id;
              const hasFollowDraft = Boolean(followById[l.id]);

              return (
                <tr key={l.id}>
                  <td>
                    <input type="checkbox" readOnly />
                  </td>

                  <td style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <LeadAvatar avatarUrl={l.avatarUrl} name={l.fullName} size={30} />
                      <Link href={`/leads/${l.id}`} style={{ fontWeight: 800 }}>
                        {l.fullName}
                      </Link>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {t("leads.sourceLabel")}: {l.source || "-"}
                    </div>
                  </td>

                  <td style={{ minWidth: 240 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 700 }}>{l.email || "-"}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {l.phone}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        <a href={`tel:${l.phone}`}>{t("leads.call")}</a>
                        <a
                          href={`https://wa.me/${normalizePhoneForWa(l.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="badge">
                      {safeTranslate(t, `leadStatuses.${l.status}`, l.status)}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 10 }}>
                      <span
                        className={`badge ${
                          tone === "danger"
                            ? "danger"
                            : tone === "warning"
                              ? "warning"
                              : tone === "info"
                                ? "info"
                                : ""
                        }`}
                        style={{
                          justifySelf: "start",
                          fontWeight: 800,
                          padding: "8px 12px",
                        }}
                      >
                        {formatFollowText(l.nextFollowUpAt, locale, t)}
                      </span>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => preset(l.id, 24)}>+1{t("leads.dayShort")}</button>
                        <button onClick={() => preset(l.id, 72)}>+3{t("leads.dayShort")}</button>
                        <button onClick={() => preset(l.id, 168)}>+7{t("leads.dayShort")}</button>
                      </div>

                      <input
                        type="datetime-local"
                        value={followById[l.id] ?? ""}
                        onChange={(e) =>
                          setFollowById((p) => ({ ...p, [l.id]: e.target.value }))
                        }
                      />

                      <button
                        onClick={() => saveFollowUp(l.id)}
                        disabled={savingFollow || !hasFollowDraft}
                      >
                        {savingFollow ? t("leads.saving") : t("leads.saveFollowUp")}
                      </button>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 8 }}>
                      <select
                        value={outcomeById[l.id] ?? "NO_ANSWER"}
                        onChange={(e) =>
                          setOutcomeById((p) => ({ ...p, [l.id]: e.target.value }))
                        }
                      >
                        {OUTCOMES.map((o) => (
                          <option key={o.key} value={o.key}>
                            {safeTranslate(t, o.labelKey, o.fallback)}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={callNoteById[l.id] ?? ""}
                        onChange={(e) =>
                          setCallNoteById((p) => ({ ...p, [l.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder={t("leads.callNotePlaceholder")}
                        style={{ resize: "vertical", minHeight: 64 }}
                      />
                    </div>
                  </td>

                  <td>
                    <button
                      className="primary"
                      onClick={() => saveOutcome(l.id)}
                      disabled={savingCall}
                    >
                      {savingCall ? t("leads.saving") : t("leads.saveCall")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {leads.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("leads.noLeads")}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div className="muted" style={{ fontSize: 13 }}>
            {pageInfoText}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() =>
                load(Math.max(1, page - 1), statusFilter, q, pageSize, interestFilter)
              }
              disabled={page <= 1 || loading}
            >
              {t("common.previous")}
            </button>

            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {t("agencies.page")} {page} / {totalPages}
            </span>

            <button
              onClick={() =>
                load(Math.min(totalPages, page + 1), statusFilter, q, pageSize, interestFilter)
              }
              disabled={page >= totalPages || loading}
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
