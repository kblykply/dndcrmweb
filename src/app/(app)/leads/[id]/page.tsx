"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import LeadAvatar from "@/app/_ui/LeadAvatar";

type UserLite = { id: string; name: string; email: string; role: string };

const CALL_OUTCOMES = [
  { key: "OPENED", label: "Açıldı / Bağlandı" },
  { key: "NO_ANSWER", label: "Cevap vermedi" },
  { key: "BUSY", label: "Meşgul" },
  { key: "UNREACHABLE", label: "Ulaşılamıyor / Telefon kapalı" },
  { key: "CALL_AGAIN", label: "Tekrar ara" },
  { key: "INTERESTED", label: "İlgilendi" },
  { key: "NOT_INTERESTED", label: "İlgilenmiyor" },
  { key: "QUALIFIED", label: "Nitelikli (Satışa hazır)" },
  { key: "WON", label: "Kazanıldı" },
  { key: "LOST", label: "Kaybedildi" },
  { key: "WRONG_NUMBER", label: "Yanlış numara" },
] as const;

function presetLocal(hoursFromNow: number) {
  const dt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

export default function LeadDetailPage() {
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [lead, setLead] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [managers, setManagers] = useState<UserLite[]>([]);
  const [sales, setSales] = useState<UserLite[]>([]);

  const [managerId, setManagerId] = useState("");
  const [salesId, setSalesId] = useState("");

  // Activity form
  const [actType, setActType] = useState("CALL");
  const [callOutcome, setCallOutcome] =
    useState<(typeof CALL_OUTCOMES)[number]["key"]>("NO_ANSWER");
  const [actSummary, setActSummary] = useState("Arama yapıldı");
  const [actDetails, setActDetails] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  const role = me?.role as string | undefined;
  const status = lead?.status as string | undefined;

  // Role checks
  const isAdmin = role === "ADMIN";
  const isCallcenter = role === "CALLCENTER" || isAdmin;
  const isManager = role === "MANAGER" || isAdmin;
  const isSales = role === "SALES" || isAdmin;

  // Status checks
  const isNew = status === "NEW";
  const isWorking = status === "WORKING";
  const isSalesReady = status === "SALES_READY";
  const isManagerReview = status === "MANAGER_REVIEW";
  const isAssigned = status === "ASSIGNED";
  const isClosed = status === "WON" || status === "LOST";

  // Allowed actions
  const canSetWorking = isCallcenter && (isNew || isSalesReady || isManagerReview);
  const canSetSalesReady = isCallcenter && (isWorking || isNew);
  const canSendToManager = isCallcenter && isSalesReady;
  const canAssignToSales = isManager && (isManagerReview || isAssigned);
  const canClose = isSales && isAssigned;

  async function load() {
    if (!id) {
      setErr("Sayfa hatası: Lead ID bulunamadı.");
      setLead(null);
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const data = await authedFetch(`/leads/${id}`);
      setLead(data);
      setManagerId(data?.assignedManagerId || "");
      setSalesId(data?.assignedSalesId || "");
    } catch (e: any) {
      setLead(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const mgrs = await authedFetch("/users?role=MANAGER");
      setManagers(mgrs);
      const reps = await authedFetch("/users?role=SALES");
      setSales(reps);
    } catch {
      // ignore
    }
  }

  async function setStatus(to: string) {
    if (!id) return;
    setErr(null);
    try {
      await authedFetch(`/leads/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function addActivity() {
    if (!id) return;
    setErr(null);

    try {
      const body: any = {
        type: actType,
        summary: actSummary,
        details: actDetails || undefined,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
      };

      if (actType === "CALL") {
        const outcomeLabel = CALL_OUTCOMES.find((x) => x.key === callOutcome)?.label || callOutcome;
        body.callOutcome = callOutcome;
        body.summary = actSummary || `Arama: ${outcomeLabel}`;
      }

      await authedFetch(`/leads/${id}/activity`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Optional auto moves
      if (actType === "CALL" && (callOutcome === "WON" || callOutcome === "LOST")) {
        await setStatus(callOutcome);
      }
      if (actType === "CALL" && callOutcome === "QUALIFIED" && (status === "NEW" || status === "WORKING")) {
        await setStatus("SALES_READY");
      }

      setActDetails("");
      setNextFollowUpAt("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function sendToManager() {
    if (!id) return;
    setErr(null);
    try {
      await authedFetch(`/leads/${id}/send-to-manager`, {
        method: "POST",
        body: JSON.stringify({ managerId }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function assignToSales() {
    if (!id) return;
    setErr(null);
    try {
      await authedFetch(`/leads/${id}/assign-to-sales`, {
        method: "POST",
        body: JSON.stringify({ salesId }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    load();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (actType !== "CALL") return;
    const label = CALL_OUTCOMES.find((x) => x.key === callOutcome)?.label || callOutcome;
    setActSummary(`Arama: ${label}`);
  }, [callOutcome, actType]);

  if (!mounted) return <div>Yükleniyor…</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Breadcrumb / header row */}
      <div className="flex-between">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/leads" style={{ fontWeight: 800 }}>← Aktif Leadler</a>
          <span className="muted">/</span>
          <span style={{ fontWeight: 900 }}>{lead?.fullName || "Lead"}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="muted">Son Aktivite: {formatDate(lead?.lastActivityAt)}</span>
        </div>
      </div>

      {loading ? <div className="card">Lead yükleniyor…</div> : null}

      {err ? (
        <pre className="card" style={{ whiteSpace: "pre-wrap", borderColor: "rgba(239,68,68,.35)" }}>
          {err}
        </pre>
      ) : null}

      {!loading && !err && lead ? (
        <>
          {/* Profile header */}
          <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
             <LeadAvatar avatarUrl={lead.avatarUrl} name={lead.fullName} size={44} />
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{lead.fullName}</div>
                <div className="muted">
                  Oluşturulma: {formatDate(lead.createdAt)} • {lead.phone} • {lead.email || "e-posta yok"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge">{lead.status}</span>
              <a href={`tel:${lead.phone}`} className="badge">Ara</a>
              <a href={`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="badge">
                WhatsApp
              </a>
              <button>Daha Fazla</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: "1px solid var(--stroke)", display: "flex", gap: 18, overflowX: "auto" }}>
            <a style={{ padding: "12px 2px", fontWeight: 800, borderBottom: "2px solid var(--text-primary)" }}>Aktivite</a>
            <a style={{ padding: "12px 2px", color: "var(--text-secondary)", fontWeight: 700 }}>Detaylar</a>
            <a style={{ padding: "12px 2px", color: "var(--text-secondary)", fontWeight: 700 }}>Dokümanlar</a>
            <a style={{ padding: "12px 2px", color: "var(--text-secondary)", fontWeight: 700 }}>Notlar</a>
          </div>

          {/* Two-column content */}
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
            {/* Left: Activity feed */}
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Son Aktiviteler</div>

              {(lead.activities || []).length === 0 ? (
                <div className="muted">Henüz aktivite yok.</div>
              ) : (
                <div style={{ display: "grid" }}>
                  {(lead.activities || []).map((a: any) => (
                    <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--stroke-2)" }}>
                      <div className="flex-between" style={{ gap: 10 }}>
                        <div style={{ fontWeight: 800 }}>
                          {a.type}
                          {a.callOutcome ? <span className="muted"> • {a.callOutcome}</span> : null}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ marginTop: 6 }}>{a.summary}</div>
                      {a.details ? <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{a.details}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: actions + add activity */}
            <div style={{ display: "grid", gap: 14 }}>
              {/* Quick actions */}
              <div className="card" style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>Hızlı İşlemler</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Atamalar</div>
                  <div className="muted">
                    Yönetici: <b>{lead.assignedManager?.email || "-"}</b> • Satış: <b>{lead.assignedSales?.email || "-"}</b>
                  </div>
                </div>

                {/* CallCenter */}
                {(isCallcenter || isAdmin) ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>Çağrı Merkezi</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => setStatus("WORKING")} disabled={!canSetWorking}>WORKING Yap</button>
                      <button onClick={() => setStatus("SALES_READY")} disabled={!canSetSalesReady}>SALES_READY Yap</button>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <select value={managerId} onChange={(e) => setManagerId(e.target.value)} disabled={!isCallcenter}>
                        <option value="">Yönetici seç</option>
                        {managers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>

                      <button onClick={sendToManager} disabled={!canSendToManager || !managerId}>
                        Yöneticiye Gönder
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Manager */}
                {(isManager || isAdmin) ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>Yönetici</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <select value={salesId} onChange={(e) => setSalesId(e.target.value)} disabled={!isManager}>
                        <option value="">Satış temsilcisi seç</option>
                        {sales.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>

                      <button onClick={assignToSales} disabled={!canAssignToSales || !salesId}>
                        {isAssigned ? "Yeniden Ata" : "Ata"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Sales */}
                {(isSales || isAdmin) ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>Satış</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="primary" onClick={() => setStatus("WON")} disabled={!canClose}>Kazanıldı</button>
                      <button className="danger" onClick={() => setStatus("LOST")} disabled={!canClose}>Kaybedildi</button>
                    </div>
                    {isClosed ? <div className="muted">Bu lead kapatıldı.</div> : null}
                  </div>
                ) : null}
              </div>

              {/* Add activity */}
              <div className="card" style={{ display: "grid", gap: 10 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 900 }}>Aktivite Ekle</div>
                  <button onClick={addActivity} className="primary">Kaydet</button>
                </div>

                <select value={actType} onChange={(e) => setActType(e.target.value)}>
                  <option value="CALL">ARAMA</option>
                  <option value="NOTE">NOT</option>
                  <option value="MEETING">TOPLANTI</option>
                  <option value="WHATSAPP">WHATSAPP</option>
                  <option value="EMAIL">E-POSTA</option>
                </select>

                {actType === "CALL" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div className="muted" style={{ fontSize: 12 }}>Arama sonucu</div>
                    <select value={callOutcome} onChange={(e) => setCallOutcome(e.target.value as any)}>
                      {CALL_OUTCOMES.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(24))}>+1g</button>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(72))}>+3g</button>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(168))}>+7g</button>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(3))}>+3s</button>
                    </div>
                  </div>
                ) : null}

                <input value={actSummary} onChange={(e) => setActSummary(e.target.value)} placeholder="Özet" />

                <textarea value={actDetails} onChange={(e) => setActDetails(e.target.value)} rows={3} placeholder="Notlar (opsiyonel)" />

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>Takip tarihi (opsiyonel)</span>
                  <input
                    type="datetime-local"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                  />
                </label>

                <div className="muted" style={{ fontSize: 12 }}>
                  İpucu: <b>Nitelikli</b> → <b>SALES_READY</b> yapar. <b>Kazanıldı/Kaybedildi</b> lead'i kapatır.
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}