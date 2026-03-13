"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";

type LeadRow = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: string;
  createdAt?: string;
  nextFollowUpAt?: string | null;
  lastActivityAt?: string | null;
};

function normalizeDeleteError(input: unknown) {
  const text = String(input || "");

  if (text.includes("Silinecek lead seçilmedi")) {
    return "Silmek için en az bir lead seçmelisiniz.";
  }

  if (text.includes("Only admin can bulk delete leads")) {
    return "Bu işlem yalnızca ADMIN kullanıcılar tarafından yapılabilir.";
  }

  return text;
}

export default function AdminLeadsPage() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAdmin = me?.role === "ADMIN";

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const data = await authedFetch("/leads?page=1&pageSize=1000");
      const items = Array.isArray(data) ? data : data?.items || [];

      setLeads(items);
      setSelected({});
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted]);

  const statuses = useMemo(() => {
    const s = Array.from(new Set((leads || []).map((l) => l.status))).filter(Boolean);
    return ["ALL", ...s];
  }, [leads]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (leads || []).filter((l) => {
      if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (!qq) return true;

      return `${l.fullName || ""} ${l.phone || ""} ${l.email || ""} ${l.source || ""} ${l.status || ""}`
        .toLowerCase()
        .includes(qq);
    });
  }, [leads, q, statusFilter]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((l) => selected[l.id]);

  function toggleAllVisible() {
    const next = { ...selected };

    if (allVisibleSelected) {
      for (const l of filtered) next[l.id] = false;
    } else {
      for (const l of filtered) next[l.id] = true;
    }

    setSelected(next);
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;

    const ok = confirm(
      `${selectedIds.length} lead kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`
    );
    if (!ok) return;

    setErr(null);
    setDeleting(true);

    try {
      const res = await authedFetch("/leads/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });

      alert(`${res.deletedCount || 0} lead silindi.`);
      await load();
    } catch (e: any) {
      setErr(normalizeDeleteError(e?.message || e));
    } finally {
      setDeleting(false);
    }
  }

  if (!mounted) return <div>Yükleniyor…</div>;

  if (!isAdmin) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Yetkisiz Erişim</div>
        <div className="muted">Bu sayfa yalnızca ADMIN kullanıcılar içindir.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Admin</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>Lead Temizliği</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Test leadlerini veya eski gereksiz kayıtları toplu olarak silebilirsiniz.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading}>
            {loading ? "Yenileniyor..." : "Yenile"}
          </button>

          <button
            className="danger"
            onClick={bulkDelete}
            disabled={deleting || selectedIds.length === 0}
          >
            {deleting
              ? "Siliniyor..."
              : `Seçilileri Sil (${selectedIds.length})`}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lead ara..."
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "Tüm Durumlar" : s}
              </option>
            ))}
          </select>
        </div>

        {err ? (
          <div
            style={{
              border: "1px solid rgba(239,68,68,.35)",
              background: "rgba(239,68,68,.08)",
              padding: 12,
              borderRadius: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                />
              </th>
              <th>AD SOYAD</th>
              <th>TELEFON</th>
              <th>E-POSTA</th>
              <th>KAYNAK</th>
              <th>DURUM</th>
              <th>SON AKTİVİTE</th>
              <th>OLUŞTURULMA</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!selected[l.id]}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [l.id]: e.target.checked,
                      }))
                    }
                  />
                </td>

                <td style={{ fontWeight: 800 }}>
                  <a
                    href={`/leads/${l.id}`}
                    style={{ textDecoration: "none", color: "var(--text-primary)" }}
                  >
                    {l.fullName}
                  </a>
                </td>

                <td>{l.phone || "-"}</td>
                <td>{l.email || "-"}</td>
                <td>{l.source || "-"}</td>

                <td>
                  <span className="badge">{l.status}</span>
                </td>

                <td>
                  {l.lastActivityAt ? new Date(l.lastActivityAt).toLocaleString() : "-"}
                </td>

                <td>
                  {l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            Lead bulunamadı.
          </div>
        ) : null}
      </div>
    </div>
  );
}