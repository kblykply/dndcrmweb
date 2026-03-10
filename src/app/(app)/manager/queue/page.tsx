"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

type SalesUser = { id: string; name: string; email: string; role: string };

function followTone(nextFollowUpAt?: string | null) {
  if (!nextFollowUpAt) return "none" as const;

  const now = Date.now();
  const t = new Date(nextFollowUpAt).getTime();

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  if (t < now) return "danger" as const; // overdue
  if (t >= startToday.getTime() && t <= endToday.getTime()) return "warning" as const; // today

  const week = now + 7 * 24 * 60 * 60 * 1000;
  if (t <= week) return "info" as const; // soon

  return "none" as const;
}

export default function ManagerQueue() {
  const [mounted, setMounted] = useState(false);

  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<SalesUser[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [assignById, setAssignById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await authedFetch("/leads?status=MANAGER_REVIEW");
      setLeads(data);

      setAssignById((prev) => {
        const next = { ...prev };
        for (const l of data) if (next[l.id] === undefined) next[l.id] = "";
        return next;
      });
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadSales() {
    try {
      const reps = await authedFetch("/users?role=SALES");
      setSales(reps);
    } catch {
      // ignore
    }
  }

  async function assign(leadId: string) {
    const salesId = assignById[leadId];
    if (!salesId) {
      setErr("Önce bir satış temsilcisi seçin.");
      return;
    }

    setErr(null);
    setSavingId(leadId);
    try {
      await authedFetch(`/leads/${leadId}/assign-to-sales`, {
        method: "POST",
        body: JSON.stringify({ salesId }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function returnToCallCenter(leadId: string) {
    setErr(null);
    setSavingId(leadId);
    try {
      await authedFetch(`/leads/${leadId}/activity`, {
        method: "POST",
        body: JSON.stringify({
          type: "NOTE",
          summary: "Çağrı Merkezine iade edildi",
          details: "Yönetici, daha fazla bilgi/ön eleme için lead'i geri gönderdi.",
        }),
      });

      await authedFetch(`/leads/${leadId}/status`, {
        method: "POST",
        body: JSON.stringify({ to: "WORKING" }),
      });

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    load();
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return leads;
    return leads.filter((l) => {
      const hay = `${l.fullName || ""} ${l.phone || ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [leads, q]);

  if (!mounted) return <div>Yükleniyor...</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Yönetici</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>İnceleme Kuyruğu</div>
            <span className="badge">{filtered.length} Lead</span>
          </div>
        </div>

        <button onClick={load} disabled={loading}>
          {loading ? "Yenileniyor..." : "Yenile"}
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="İsim / telefon ara..."
            />
          </div>

          <button onClick={load} disabled={loading}>
            {loading ? "Yükleniyor..." : "Ara / Yenile"}
          </button>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 10,
              border: "1px solid rgba(239,68,68,.35)",
              background: "rgba(239,68,68,.08)",
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>LEAD</th>
              <th>TELEFON</th>
              <th>DURUM</th>
              <th>TAKİP</th>
              <th>SATIŞA ATA</th>
              <th>İŞLEMLER</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l) => {
              const tone = followTone(l.nextFollowUpAt);
              const saving = savingId === l.id;

              return (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      <a href={`/leads/${l.id}`} style={{ fontWeight: 900 }}>
                        {l.fullName}
                      </a>
                      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        Son aktivite: {l.lastActivityAt ? new Date(l.lastActivityAt).toLocaleString() : "-"}
                      </div>
                    </div>
                  </td>

                  <td>{l.phone}</td>

                  <td>
                    <span className="badge">{l.status}</span>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 8 }}>
                      <span className={`badge ${tone}`}>
                        {l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleString() : "Takip yok"}
                      </span>
                    </div>
                  </td>

                  <td style={{ minWidth: 320 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <select
                        value={assignById[l.id] ?? ""}
                        onChange={(e) => setAssignById((p) => ({ ...p, [l.id]: e.target.value }))}
                        style={{ minWidth: 220 }}
                      >
                        <option value="">Satış temsilcisi seç</option>
                        {sales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      </select>

                      <button
                        className="primary"
                        onClick={() => assign(l.id)}
                        disabled={saving || !assignById[l.id]}
                      >
                        {saving ? "Kaydediliyor..." : "Ata"}
                      </button>
                    </div>
                  </td>

                  <td style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => returnToCallCenter(l.id)} disabled={saving}>
                        Çağrı Merkezine Gönder
                      </button>
                      <a href={`/leads/${l.id}`} style={{ textDecoration: "underline" }}>
                        Aç
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            MANAGER_REVIEW durumunda lead yok.
          </div>
        ) : null}
      </div>
    </div>
  );
}