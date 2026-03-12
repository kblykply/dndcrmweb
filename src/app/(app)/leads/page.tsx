"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import LeadAvatar from "../../_ui/LeadAvatar";

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
  { key: "OPENED", label: "Açıldı / Bağlandı" },
  { key: "NO_ANSWER", label: "Cevap yok" },
  { key: "BUSY", label: "Meşgul" },
  { key: "UNREACHABLE", label: "Ulaşılamıyor" },
  { key: "CALL_AGAIN", label: "Tekrar ara" },
  { key: "INTERESTED", label: "İlgilendi" },
  { key: "NOT_INTERESTED", label: "İlgilenmiyor" },
  { key: "QUALIFIED", label: "Nitelikli (Satışa hazır)" },
  { key: "WON", label: "Kazanıldı" },
  { key: "LOST", label: "Kaybedildi" },
  { key: "WRONG_NUMBER", label: "Yanlış numara" },
] as const;

function normalizePhoneForWa(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function toDatetimeLocal(hoursFromNow: number) {
  const dt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
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

function formatFollowText(nextFollowUpAt?: string | null) {
  if (!nextFollowUpAt) return "Takip yok";
  return new Date(nextFollowUpAt).toLocaleString("tr-TR");
}

export default function LeadsPage() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUSES)[number]>("ALL");
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
  const [savingId, setSavingId] = useState<string | null>(null);

  const canCreate = me?.role === "CALLCENTER" || me?.role === "ADMIN";

  async function load(
    nextPage = page,
    nextStatus = statusFilter,
    nextQ = q,
    nextPageSize = pageSize
  ) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (nextStatus !== "ALL") params.set("status", nextStatus);
      if (nextQ.trim()) params.set("q", nextQ.trim());

      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));

      const res = await authedFetch(`/leads?${params.toString()}`);
      const items = res.items || [];

      setLeads(items);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || nextPage);
      setPageSize(res.pageSize || nextPageSize);

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
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function createLead() {
    setErr(null);
    try {
      await authedFetch("/leads", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          source: source.trim(),
        }),
      });

      setFullName("");
      setPhone("");
      setSource("Website");
      setShowCreate(false);
      await load(1, statusFilter, q, pageSize);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function saveOutcome(leadId: string) {
    setErr(null);
    setSavingId(leadId);

    try {
      const outcome = outcomeById[leadId] || "NO_ANSWER";
      const followLocal = followById[leadId] || "";

      const body: any = {
        type: "CALL",
        callOutcome: outcome,
        summary: `Arama: ${outcome}`,
      };

      if (followLocal) {
        body.nextFollowUpAt = new Date(followLocal).toISOString();
      }

      await authedFetch(`/leads/${leadId}/activity`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setFollowById((p) => ({ ...p, [leadId]: "" }));
      await load(page, statusFilter, q, pageSize);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  function preset(leadId: string, hours: number) {
    setFollowById((p) => ({ ...p, [leadId]: toDatetimeLocal(hours) }));
  }

  function runSearch() {
    setQ(searchInput.trim());
    load(1, statusFilter, searchInput.trim(), pageSize);
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load(1, statusFilter, q, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const pageInfoText = useMemo(() => {
    if (!total) return "Kayıt yok";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} / ${total}`;
  }, [page, pageSize, total]);

  if (!mounted) return <div>Yükleniyor…</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Kişiler</div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900 }}>Leadler</div>
            <span className="badge" style={{ fontWeight: 800 }}>
              {total} Lead
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={canCreate ? "primary" : ""}
            disabled={!canCreate}
          >
            {showCreate ? "Kapat" : "Yeni Lead"}
          </button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--stroke)", display: "flex", gap: 18 }}>
        <a
          href="/leads"
          style={{
            padding: "12px 2px",
            fontWeight: 800,
            borderBottom: "2px solid var(--text-primary)",
          }}
        >
          Leadler
        </a>
        <span
          style={{
            padding: "12px 2px",
            fontWeight: 700,
            color: "var(--text-secondary)",
          }}
        >
          Referans Ortaklar
        </span>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Lead Oluştur</div>
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
              placeholder="Ad Soyad"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon"
            />
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Kaynak"
            />
            <button
              className="primary"
              onClick={createLead}
              disabled={!fullName.trim() || !phone.trim()}
            >
              Oluştur
            </button>
          </div>
          {err ? <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre> : null}
        </div>
      ) : null}

      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px,1fr) 220px 130px auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="İsim, telefon, email veya kaynak ara…"
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "Tüm Durumlar" : s}
              </option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={25}>25 / sayfa</option>
            <option value={50}>50 / sayfa</option>
            <option value={100}>100 / sayfa</option>
          </select>

          <button onClick={runSearch} disabled={loading}>
            {loading ? "Yükleniyor…" : "Ara"}
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
                <input type="checkbox" />
              </th>
              <th>İSİM</th>
              <th>İLETİŞİM</th>
              <th>DURUM</th>
              <th style={{ width: 260 }}>TAKİP</th>
              <th style={{ width: 260 }}>ARAMA SONUCU</th>
              <th style={{ width: 120 }}>KAYDET</th>
            </tr>
          </thead>

          <tbody>
            {leads.map((l) => {
              const tone = followTone(l.nextFollowUpAt);
              const saving = savingId === l.id;

              return (
                <tr key={l.id}>
                  <td>
                    <input type="checkbox" />
                  </td>

                  <td style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <LeadAvatar avatarUrl={l.avatarUrl} name={l.fullName} size={30} />
                      <a href={`/leads/${l.id}`} style={{ fontWeight: 800 }}>
                        {l.fullName}
                      </a>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      Kaynak: {l.source || "-"}
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
                        <a href={`tel:${l.phone}`}>Ara</a>
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
                    <span className="badge">{l.status}</span>
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
                        {formatFollowText(l.nextFollowUpAt)}
                      </span>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => preset(l.id, 24)}>+1g</button>
                        <button onClick={() => preset(l.id, 72)}>+3g</button>
                        <button onClick={() => preset(l.id, 168)}>+7g</button>
                      </div>
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
                            {o.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="datetime-local"
                        value={followById[l.id] ?? ""}
                        onChange={(e) =>
                          setFollowById((p) => ({ ...p, [l.id]: e.target.value }))
                        }
                      />
                    </div>
                  </td>

                  <td>
                    <button
                      className="primary"
                      onClick={() => saveOutcome(l.id)}
                      disabled={saving}
                    >
                      {saving ? "Kaydediliyor…" : "Kaydet"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {leads.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            Lead bulunamadı.
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
              onClick={() => load(Math.max(1, page - 1), statusFilter, q, pageSize)}
              disabled={page <= 1 || loading}
            >
              Önceki
            </button>

            <span style={{ fontSize: 13, fontWeight: 700 }}>
              Sayfa {page} / {totalPages}
            </span>

            <button
              onClick={() => load(Math.min(totalPages, page + 1), statusFilter, q, pageSize)}
              disabled={page >= totalPages || loading}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
