"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";

type PresentationStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

type PresentationOutcome =
  | "POSITIVE"
  | "NEGATIVE"
  | "FOLLOW_UP"
  | "NO_DECISION"
  | "WON"
  | "LOST";

type SalesUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type CustomerDetail = {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  source?: string | null;
  type?: "POTENTIAL" | "EXISTING";
  notesSummary?: string | null;
  ownerId?: string | null;
  agency?: {
    id: string;
    name: string;
  } | null;
  presentations: Array<{
    id: string;
    title: string;
    projectName?: string | null;
    presentationAt: string;
    location?: string | null;
    status: PresentationStatus;
    outcome?: PresentationOutcome | null;
    notesSummary?: string | null;
    createdAt?: string;
    createdBy?: {
      id: string;
      name: string;
      email: string;
    };
    assignedSales?: {
      id: string;
      name: string;
      email: string;
    };
    notes: Array<{
      id: string;
      note: string;
      createdAt: string;
      createdBy?: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  }>;
};

const STATUS_OPTIONS: PresentationStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
];

const OUTCOME_OPTIONS: PresentationOutcome[] = [
  "POSITIVE",
  "NEGATIVE",
  "FOLLOW_UP",
  "NO_DECISION",
  "WON",
  "LOST",
];

function badgeClass(status?: string) {
  if (status === "COMPLETED" || status === "POSITIVE" || status === "WON") {
    return "success";
  }
  if (
    status === "SCHEDULED" ||
    status === "FOLLOW_UP" ||
    status === "NO_DECISION"
  ) {
    return "info";
  }
  if (status === "RESCHEDULED") {
    return "warning";
  }
  if (status === "CANCELLED" || status === "NEGATIVE" || status === "LOST") {
    return "danger";
  }
  return "";
}

export default function CustomerDetailPage() {
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const customerId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [presentationAt, setPresentationAt] = useState("");
  const [location, setLocation] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [assignedSalesId, setAssignedSalesId] = useState("");

  const [noteByPresentationId, setNoteByPresentationId] = useState<
    Record<string, string>
  >({});

  const role = me?.role as string | undefined;
  const isSales = role === "SALES";
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";
  const canCreatePresentation =
    role === "MANAGER" || role === "ADMIN" || role === "SALES";

  async function loadCustomer() {
    if (!customerId) {
      setErr("Müşteri ID bulunamadı.");
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const customerData = await authedFetch(`/customers/${customerId}`);
      setCustomer(customerData);
    } catch (e: any) {
      setCustomer(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadSalesUsers() {
    if (!isManagerOrAdmin) {
      setSalesUsers([]);
      return;
    }

    try {
      const sales = await authedFetch("/users?role=SALES");
      setSalesUsers(Array.isArray(sales) ? sales : []);
    } catch {
      setSalesUsers([]);
    }
  }

  async function load() {
    await Promise.all([loadCustomer(), loadSalesUsers()]);
  }

  async function createPresentation() {
    if (!customer || !title.trim() || !presentationAt) return;

    setErr(null);
    setSaving(true);

    try {
      await authedFetch(`/customers/${customer.id}/presentations`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          projectName: projectName.trim() || undefined,
          presentationAt: new Date(presentationAt).toISOString(),
          location: location.trim() || undefined,
          notesSummary: notesSummary.trim() || undefined,
          assignedSalesId: isSales ? undefined : assignedSalesId || null,
        }),
      });

      setTitle("");
      setProjectName("");
      setPresentationAt("");
      setLocation("");
      setNotesSummary("");
      setAssignedSalesId(isSales ? me?.id || "" : "");

      await loadCustomer();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function addPresentationNote(presentationId: string) {
    const note = (noteByPresentationId[presentationId] || "").trim();
    if (!note) return;

    setErr(null);
    setSaving(true);

    try {
      await authedFetch(`/presentations/${presentationId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });

      setNoteByPresentationId((prev) => ({
        ...prev,
        [presentationId]: "",
      }));

      await loadCustomer();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function updatePresentation(
    presentationId: string,
    patch: {
      status?: PresentationStatus;
      outcome?: PresentationOutcome;
    },
  ) {
    setErr(null);
    setSaving(true);

    try {
      await authedFetch(`/presentations/${presentationId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      await loadCustomer();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadCustomer();
  }, [mounted, customerId]);

  useEffect(() => {
    if (!mounted) return;
    if (!me) return;

    if (role === "SALES") {
      setAssignedSalesId(me?.id || "");
      setSalesUsers([]);
    } else {
      loadSalesUsers();
    }
  }, [mounted, me, role]);

  const stats = useMemo(() => {
    const presentations = customer?.presentations || [];
    return {
      total: presentations.length,
      completed: presentations.filter((p) => p.status === "COMPLETED").length,
      scheduled: presentations.filter((p) => p.status === "SCHEDULED").length,
      won: presentations.filter((p) => p.outcome === "WON").length,
    };
  }, [customer]);

  if (!mounted) return <div>Yükleniyor…</div>;
  if (loading) return <div className="card">Müşteri yükleniyor…</div>;

  if (!customer) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Müşteri Bulunamadı</div>
        <div className="muted">{err || "Böyle bir müşteri yok."}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <a href="/customers" style={{ fontWeight: 800 }}>
            ← Müşterilere Dön
          </a>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{customer.fullName}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {customer.companyName || "-"} • {customer.agency?.name || "Ajans yok"}
          </div>
        </div>

        <span
          className={`badge ${
            customer.type === "EXISTING" ? "success" : "info"
          }`}
        >
          {customer.type || "-"}
        </span>
      </div>

      {err ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(239,68,68,.35)",
            background: "rgba(239,68,68,.08)",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="muted">Toplam Sunum</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.total}</div>
        </div>
        <div className="card">
          <div className="muted">Planlı</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.scheduled}</div>
        </div>
        <div className="card">
          <div className="muted">Tamamlanan</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.completed}</div>
        </div>
        <div className="card">
          <div className="muted">WON</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.won}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>Müşteri Bilgileri</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <b>Telefon:</b> {customer.phone || "-"}
          </div>
          <div>
            <b>E-posta:</b> {customer.email || "-"}
          </div>
          <div>
            <b>Ajans:</b> {customer.agency?.name || "-"}
          </div>
          <div>
            <b>Şehir:</b> {customer.city || "-"}
          </div>
          <div>
            <b>Ülke:</b> {customer.country || "-"}
          </div>
          <div>
            <b>Kaynak:</b> {customer.source || "-"}
          </div>
        </div>

        {customer.notesSummary ? (
          <div
            style={{
              border: "1px solid var(--stroke)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface-2)",
            }}
          >
            {customer.notesSummary}
          </div>
        ) : null}
      </div>

      {canCreatePresentation ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>Yeni Sunum Ekle</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 180px 180px 180px",
              gap: 10,
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sunum başlığı"
            />
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Proje adı"
            />
            <input
              type="datetime-local"
              value={presentationAt}
              onChange={(e) => setPresentationAt(e.target.value)}
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lokasyon"
            />

            {isSales ? (
              <input value={me?.name || ""} disabled />
            ) : (
              <select
                value={assignedSalesId}
                onChange={(e) => setAssignedSalesId(e.target.value)}
              >
                <option value="">Sales temsilcisi seç</option>
                {salesUsers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            value={notesSummary}
            onChange={(e) => setNotesSummary(e.target.value)}
            placeholder="Sunum özet notu"
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="primary"
              onClick={createPresentation}
              disabled={
                saving ||
                !title.trim() ||
                !presentationAt ||
                (!isSales && !assignedSalesId)
              }
            >
              {saving ? "Kaydediliyor..." : "Sunum Oluştur"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>Sunum Geçmişi</div>

        {customer.presentations.length === 0 ? (
          <div
            style={{
              border: "1px solid var(--stroke)",
              borderRadius: 14,
              background: "var(--surface-2)",
              padding: 18,
              color: "var(--text-secondary)",
            }}
          >
            Henüz sunum kaydı yok.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {customer.presentations.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 14,
                  background: "var(--surface-2)",
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{p.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.projectName || "-"} •{" "}
                      {new Date(p.presentationAt).toLocaleString()}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Sales: {p.assignedSales?.name || "-"} • Oluşturan:{" "}
                      {p.createdBy?.name || "-"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${badgeClass(p.status)}`}>
                      {p.status}
                    </span>
                    {p.outcome ? (
                      <span className={`badge ${badgeClass(p.outcome)}`}>
                        {p.outcome}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ fontSize: 13 }}>
                  <b>Lokasyon:</b> {p.location || "-"}
                </div>

                {p.notesSummary ? (
                  <div
                    style={{
                      border: "1px solid var(--stroke)",
                      borderRadius: 12,
                      padding: 10,
                      background: "var(--surface)",
                    }}
                  >
                    {p.notesSummary}
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <select
                    value={p.status}
                    onChange={(e) =>
                      updatePresentation(p.id, {
                        status: e.target.value as PresentationStatus,
                      })
                    }
                    disabled={saving}
                    style={{ width: 180 }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={p.outcome || ""}
                    onChange={(e) =>
                      updatePresentation(p.id, {
                        outcome: e.target.value as PresentationOutcome,
                      })
                    }
                    disabled={saving}
                    style={{ width: 180 }}
                  >
                    <option value="">Outcome seç</option>
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Sunum Notları</div>

                  {p.notes.length === 0 ? (
                    <div className="muted">Henüz not yok.</div>
                  ) : (
                    p.notes.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          border: "1px solid var(--stroke)",
                          borderRadius: 12,
                          padding: 10,
                          background: "var(--surface)",
                        }}
                      >
                        <div
                          className="muted"
                          style={{ fontSize: 12, marginBottom: 4 }}
                        >
                          {n.createdBy?.name || "-"} •{" "}
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                        <div>{n.note}</div>
                      </div>
                    ))
                  )}

                  <div style={{ display: "grid", gap: 8 }}>
                    <textarea
                      value={noteByPresentationId[p.id] || ""}
                      onChange={(e) =>
                        setNoteByPresentationId((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder="Bu sunuma not ekle..."
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="primary"
                        onClick={() => addPresentationNote(p.id)}
                        disabled={saving || !(noteByPresentationId[p.id] || "").trim()}
                      >
                        Not Ekle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}