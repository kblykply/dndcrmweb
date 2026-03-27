"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";

type CustomerType = "POTENTIAL" | "EXISTING";

type AgencyRow = {
  id: string;
  name: string;
};

type CustomerRow = {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  type?: CustomerType;
  notesSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
  agency?: AgencyRow | null;
  _count?: {
    presentations: number;
  };
};

const TYPE_OPTIONS: Array<"ALL" | CustomerType> = [
  "ALL",
  "POTENTIAL",
  "EXISTING",
];

function badgeClass(type?: string) {
  if (type === "EXISTING") return "success";
  if (type === "POTENTIAL") return "info";
  return "";
}

export default function CustomersPage() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<CustomerRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | CustomerType>("ALL");

  const [showCreate, setShowCreate] = useState(false);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [type, setType] = useState<CustomerType>("POTENTIAL");
  const [agencyId, setAgencyId] = useState("");

  const role = me?.role as string | undefined;
  const canCreate =
    role === "MANAGER" || role === "ADMIN" || role === "SALES";
  const canDelete = role === "MANAGER" || role === "ADMIN";

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await authedFetch("/customers");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgencies() {
    try {
      const res = await authedFetch("/agencies?page=1&pageSize=200");
      setAgencies(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setAgencies([]);
    }
  }

  async function createCustomer() {
    setErr(null);
    setSaving(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        address: address.trim() || undefined,
        source: source.trim() || undefined,
        notesSummary: notesSummary.trim() || undefined,
        type,
        agencyId: agencyId || null,
      };

      await authedFetch("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFullName("");
      setCompanyName("");
      setPhone("");
      setEmail("");
      setCity("");
      setCountry("");
      setAddress("");
      setSource("");
      setNotesSummary("");
      setType("POTENTIAL");
      setAgencyId("");
      setShowCreate(false);

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string, name: string) {
    const ok = window.confirm(
      `"${name}" müşterisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    );
    if (!ok) return;

    setErr(null);
    setDeletingId(id);

    try {
      await authedFetch(`/customers/${id}`, {
        method: "DELETE",
      });

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
    loadAgencies();
  }, [mounted]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((c) => {
      if (typeFilter !== "ALL" && c.type !== typeFilter) return false;
      if (!qq) return true;

      return `${c.fullName || ""} ${c.companyName || ""} ${c.phone || ""} ${c.email || ""} ${c.city || ""} ${c.country || ""} ${c.agency?.name || ""}`
        .toLowerCase()
        .includes(qq);
    });
  }, [items, q, typeFilter]);

  if (!mounted) return <div>Yükleniyor…</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Sunum & Müşteri Yönetimi
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>Müşteriler</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Potansiyel ve mevcut müşteriler, sunum geçmişiyle birlikte burada
            tutulur
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading}>
            {loading ? "Yenileniyor..." : "Yenile"}
          </button>

          {canCreate ? (
            <button
              className="primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? "Kapat" : "Yeni Müşteri"}
            </button>
          ) : null}
        </div>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>Yeni Müşteri Oluştur</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ad Soyad"
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Şirket / Kurum"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Şehir"
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ülke"
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adres"
            />
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Kaynak"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
            >
              <option value="POTENTIAL">POTENTIAL</option>
              <option value="EXISTING">EXISTING</option>
            </select>

            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
            >
              <option value="">Ajans seç</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={notesSummary}
            onChange={(e) => setNotesSummary(e.target.value)}
            placeholder="Özet not"
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowCreate(false)}>Vazgeç</button>
            <button
              className="primary"
              onClick={createCustomer}
              disabled={saving || !fullName.trim()}
            >
              {saving ? "Kaydediliyor..." : "Müşteri Oluştur"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px auto",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Müşteri, telefon, e-posta, ajans ara..."
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === "ALL" ? "Tüm Tipler" : t}
              </option>
            ))}
          </select>

          <button onClick={load} disabled={loading}>
            Ara / Yenile
          </button>
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
              <th>MÜŞTERİ</th>
              <th>İLETİŞİM</th>
              <th>AJANS</th>
              <th>TİP</th>
              <th>SUNUM SAYISI</th>
              <th>GÜNCELLEME</th>
              {canDelete ? <th>İŞLEMLER</th> : null}
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <a href={`/customers/${c.id}`} style={{ fontWeight: 900 }}>
                      {c.fullName}
                    </a>
                    <div
                      style={{ color: "var(--text-secondary)", fontSize: 12 }}
                    >
                      {c.companyName || "-"}
                    </div>
                  </div>
                </td>

                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div>{c.phone || "-"}</div>
                    <div
                      style={{ color: "var(--text-secondary)", fontSize: 12 }}
                    >
                      {c.email || "-"}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {[c.city, c.country].filter(Boolean).join(", ") || "-"}
                    </div>
                  </div>
                </td>

                <td>{c.agency?.name || "-"}</td>

                <td>
                  <span className={`badge ${badgeClass(c.type)}`}>
                    {c.type || "-"}
                  </span>
                </td>

                <td>{c._count?.presentations ?? 0}</td>

                <td>
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "-"}
                </td>

                {canDelete ? (
                  <td>
                    <button
                      className="danger"
                      onClick={() => deleteCustomer(c.id, c.fullName)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? "Siliniyor..." : "Sil"}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            Müşteri bulunamadı.
          </div>
        ) : null}
      </div>
    </div>
  );
}