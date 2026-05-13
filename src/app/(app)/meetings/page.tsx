"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type MeetingKind = "AGENCY" | "PRESENTATION" | "OTHER";
type MeetingKindFilter = "ALL" | MeetingKind;

type AgencyLite = {
  id: string;
  name: string;
};

type CustomerLite = {
  id: string;
  fullName: string;
  companyName?: string | null;
};

type UserLite = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type MeetingRow = {
  id: string;
  kind: MeetingKind;
  title: string;
  notes?: string | null;
  meetingAt: string;
  createdAt?: string;
  updatedAt?: string;

  agency?: { id: string; name: string } | null;
  customer?: { id: string; fullName: string; companyName?: string | null } | null;

  assignedSales?: { id: string; name: string; email: string; role?: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;

  projectName?: string | null;
  location?: string | null;

  contactName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;

  status?: string | null;
  outcome?: string | null;
};

type MeetingsResponse = {
  items: MeetingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const KIND_OPTIONS: MeetingKindFilter[] = ["ALL", "AGENCY", "PRESENTATION", "OTHER"];

function safeTranslate(t: (path: string) => string, path: string, fallback?: string | null) {
  const translated = t(path);
  return translated === path ? fallback ?? path : translated;
}

function kindBadgeClass(kind?: string) {
  if (kind === "AGENCY") return "info";
  if (kind === "PRESENTATION") return "success";
  if (kind === "OTHER") return "warning";
  return "";
}

function statusBadgeClass(status?: string | null) {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "RESCHEDULED") return "info";
  return "";
}

function isPast(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function formatDateTime(value?: string | null, locale: "tr" | "en" = "en") {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

function optionMatch(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export default function MeetingsPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<MeetingRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyLite[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserLite[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [kind, setKind] = useState<MeetingKindFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [responsibleFilterId, setResponsibleFilterId] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [createKind, setCreateKind] = useState<MeetingKind>("AGENCY");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [assignedSalesId, setAssignedSalesId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");

  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [agencySearch, setAgencySearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [responsibleSearch, setResponsibleSearch] = useState("");

  const role = me?.role as string | undefined;
  const canCreate = role === "ADMIN" || role === "MANAGER" || role === "SALES";

  function canModify(item: MeetingRow) {
    if (role === "ADMIN" || role === "MANAGER") return true;
    return item.createdBy?.id === me?.id;
  }

  function kindLabel(value?: string | null) {
    if (!value) return "-";
    if (value === "AGENCY") return locale === "tr" ? "Ajans" : "Agency";
    if (value === "PRESENTATION") return locale === "tr" ? "Sunum" : "Presentation";
    if (value === "OTHER") return locale === "tr" ? "Diğer" : "Other";
    return value;
  }

  function statusLabel(value?: string | null) {
    if (!value) return locale === "tr" ? "Planlandı" : "Scheduled";

    const labels: Record<string, string> = {
      SCHEDULED: locale === "tr" ? "Planlandı" : "Scheduled",
      COMPLETED: locale === "tr" ? "Tamamlandı" : "Completed",
      CANCELLED: locale === "tr" ? "İptal Edildi" : "Cancelled",
      RESCHEDULED: locale === "tr" ? "Yeniden Planlandı" : "Rescheduled",
    };

    return labels[value] || value;
  }

  function outcomeLabel(value?: string | null) {
    if (!value) return "";

    const labels: Record<string, string> = {
      POSITIVE: locale === "tr" ? "Pozitif" : "Positive",
      NEGATIVE: locale === "tr" ? "Negatif" : "Negative",
      FOLLOW_UP: locale === "tr" ? "Takip Edilecek" : "Follow-up",
      NO_DECISION: locale === "tr" ? "Karar Yok" : "No Decision",
      WON: locale === "tr" ? "Kazanıldı" : "Won",
      LOST: locale === "tr" ? "Kaybedildi" : "Lost",
    };

    return labels[value] || value;
  }

  const filteredAgencies = useMemo(() => {
    if (!agencySearch.trim()) return agencies.slice(0, 80);
    return agencies.filter((a) => optionMatch(a.name, agencySearch)).slice(0, 80);
  }, [agencies, agencySearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 80);
    return customers
      .filter((c) => optionMatch(`${c.fullName} ${c.companyName || ""}`, customerSearch))
      .slice(0, 80);
  }, [customers, customerSearch]);

  const filteredAssignableUsers = useMemo(() => {
    if (!responsibleSearch.trim()) return assignableUsers.slice(0, 80);

    return assignableUsers
      .filter((u) => optionMatch(`${u.name} ${u.email} ${u.role}`, responsibleSearch))
      .slice(0, 80);
  }, [assignableUsers, responsibleSearch]);

  async function load(
    nextPage = page,
    nextKind = kind,
    nextQ = q,
    nextPageSize = pageSize,
    nextFrom = from,
    nextTo = to,
    nextResponsibleFilterId = responsibleFilterId,
  ) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextKind !== "ALL") params.set("kind", nextKind);
      if (nextResponsibleFilterId) params.set("assignedSalesId", nextResponsibleFilterId);
      if (nextFrom) params.set("from", new Date(nextFrom).toISOString());
      if (nextTo) params.set("to", new Date(nextTo).toISOString());

      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));

      const res = (await authedFetch(`/meetings?${params.toString()}`)) as MeetingsResponse;

      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total || 0);
      setPage(res?.page || nextPage);
      setPageSize(res?.pageSize || nextPageSize);
      setTotalPages(res?.totalPages || 1);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadRefs() {
    if (!canCreate) return;

    setLoadingRefs(true);

    try {
      const [agenciesRes, customersRes, salesRes, managersRes] = await Promise.all([
        authedFetch("/agencies?page=1&pageSize=500"),
        authedFetch("/customers?page=1&pageSize=500"),
        authedFetch("/users?role=SALES"),
        authedFetch("/users?role=MANAGER"),
      ]);

      const sales = Array.isArray(salesRes) ? salesRes : [];
      const managers = Array.isArray(managersRes) ? managersRes : [];

      setAgencies(Array.isArray(agenciesRes?.items) ? agenciesRes.items : []);
      setCustomers(
        Array.isArray(customersRes?.items)
          ? customersRes.items
          : Array.isArray(customersRes)
            ? customersRes
            : [],
      );

      setAssignableUsers([...managers, ...sales]);
    } catch {
      setAgencies([]);
      setCustomers([]);
      setAssignableUsers([]);
    } finally {
      setLoadingRefs(false);
    }
  }

  function resetCreateForm() {
    setCreateKind("AGENCY");
    setTitle("");
    setNotes("");
    setMeetingAt("");
    setAgencyId("");
    setCustomerId("");
    setAssignedSalesId("");
    setProjectName("");
    setLocation("");
    setContactName("");
    setCompanyName("");
    setPhone("");
    setEmail("");
    setAgencySearch("");
    setCustomerSearch("");
    setResponsibleSearch("");
  }

  async function createMeeting() {
    if (!title.trim() || !meetingAt) return;

    setErr(null);
    setSaving(true);

    try {
      const body: any = {
        kind: createKind,
        title: title.trim(),
        notes: notes.trim() || undefined,
        meetingAt: new Date(meetingAt).toISOString(),
        assignedSalesId:
          role === "SALES" || role === "MANAGER"
            ? me?.id
            : assignedSalesId || undefined,
      };

      if (createKind === "AGENCY") {
        body.agencyId = agencyId || undefined;
        body.customerId = customerId || undefined;
      }

      if (createKind === "PRESENTATION") {
        body.agencyId = agencyId || undefined;
        body.customerId = customerId || undefined;
        body.projectName = projectName.trim() || undefined;
        body.location = location.trim() || undefined;
      }

      if (createKind === "OTHER") {
        body.contactName = contactName.trim() || undefined;
        body.companyName = companyName.trim() || undefined;
        body.phone = phone.trim() || undefined;
        body.email = email.trim() || undefined;
      }

      await authedFetch("/meetings", {
        method: "POST",
        body: JSON.stringify(body),
      });

      resetCreateForm();
      setShowCreate(false);
      await load(1, kind, q, pageSize, from, to, responsibleFilterId);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeeting(item: MeetingRow) {
    const ok = window.confirm(
      locale === "tr"
        ? "Bu toplantıyı silmek istediğinize emin misiniz?"
        : "Are you sure you want to delete this meeting?",
    );

    if (!ok) return;

    setDeletingId(item.id);
    setErr(null);

    try {
      await authedFetch(`/meetings/${item.kind}/${item.id}`, {
        method: "DELETE",
      });

      await load(page, kind, q, pageSize, from, to, responsibleFilterId);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  }

  function runSearch() {
    const trimmed = searchInput.trim();
    setQ(trimmed);
    load(1, kind, trimmed, pageSize, from, to, responsibleFilterId);
  }

  function clearFilters() {
    setSearchInput("");
    setQ("");
    setKind("ALL");
    setFrom("");
    setTo("");
    setResponsibleFilterId("");
    setPageSize(20);
    load(1, "ALL", "", 20, "", "", "");
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load(1, kind, q, pageSize, from, to, responsibleFilterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !canCreate) return;
    loadRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, canCreate]);

  const pageInfo = useMemo(() => {
    if (!total) return t("common.noRecords");
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} / ${total}`;
  }, [page, pageSize, total, t]);

  const upcomingCount = useMemo(
    () => items.filter((x) => !isPast(x.meetingAt)).length,
    [items],
  );

  const pastCount = useMemo(
    () => items.filter((x) => isPast(x.meetingAt)).length,
    [items],
  );

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {safeTranslate(
              t,
              "meetings.label",
              locale === "tr" ? "Toplantı Yönetimi" : "Meeting Management",
            )}
          </div>

          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {safeTranslate(
              t,
              "meetings.title",
              locale === "tr" ? "Toplantılar" : "Meetings",
            )}
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            {locale === "tr"
              ? "Ajans, sunum ve harici toplantıları tek ekranda yönetin."
              : "Manage agency, presentation and external meetings in one place."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => load(page, kind, q, pageSize, from, to, responsibleFilterId)}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canCreate ? (
            <button className="primary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate
                ? t("common.close")
                : locale === "tr"
                  ? "Yeni Toplantı"
                  : "New Meeting"}
            </button>
          ) : null}
        </div>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 14 }}>
          <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>
                {locale === "tr" ? "Yeni Toplantı Oluştur" : "Create New Meeting"}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {locale === "tr"
                  ? "Yeni toplantılar otomatik olarak Planlandı durumunda oluşturulur."
                  : "New meetings are automatically created as Scheduled."}
              </div>
            </div>

            <span className="badge">
              {locale === "tr" ? "Durum: Planlandı" : "Status: Scheduled"}
            </span>

            {loadingRefs ? <span className="muted">{t("common.loading")}</span> : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["AGENCY", "PRESENTATION", "OTHER"] as MeetingKind[]).map((option) => (
              <button
                key={option}
                type="button"
                className={createKind === option ? "primary" : ""}
                onClick={() => setCreateKind(option)}
              >
                {kindLabel(option)}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "tr" ? "Toplantı başlığı *" : "Meeting title *"}
            />

            <input
              type="datetime-local"
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
            />

            {role === "SALES" || role === "MANAGER" ? (
              <input value={me?.name || ""} disabled />
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <input
                  value={responsibleSearch}
                  onChange={(e) => setResponsibleSearch(e.target.value)}
                  placeholder={locale === "tr" ? "Sorumlu kişi ara..." : "Search responsible user..."}
                />
                <select
                  value={assignedSalesId}
                  onChange={(e) => setAssignedSalesId(e.target.value)}
                  disabled={loadingRefs}
                >
                  <option value="">
                    {locale === "tr"
                      ? "Sorumlu kişi seçmeden devam et"
                      : "Continue without responsible user"}
                  </option>
                  {filteredAssignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {createKind !== "OTHER" ? (
              <>
                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    value={agencySearch}
                    onChange={(e) => setAgencySearch(e.target.value)}
                    placeholder={locale === "tr" ? "Ajans ara..." : "Search agency..."}
                  />
                  <select
                    value={agencyId}
                    onChange={(e) => setAgencyId(e.target.value)}
                    disabled={loadingRefs}
                  >
                    <option value="">
                      {locale === "tr"
                        ? "Ajans seçmeden devam et"
                        : "Continue without agency"}
                    </option>
                    {filteredAgencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={locale === "tr" ? "Müşteri ara..." : "Search customer..."}
                  />
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={loadingRefs}
                  >
                    <option value="">
                      {locale === "tr"
                        ? "Müşteri seçmeden devam et"
                        : "Continue without customer"}
                    </option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                        {c.companyName ? ` (${c.companyName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={locale === "tr" ? "Kişi adı" : "Contact name"}
                />

                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={locale === "tr" ? "Şirket / Kurum adı" : "Company name"}
                />

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={locale === "tr" ? "Telefon" : "Phone"}
                />

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={locale === "tr" ? "E-posta" : "Email"}
                />
              </>
            )}

            {createKind === "PRESENTATION" ? (
              <>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={locale === "tr" ? "Proje adı" : "Project name"}
                />

                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={locale === "tr" ? "Lokasyon" : "Location"}
                />
              </>
            ) : null}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={locale === "tr" ? "Notlar" : "Notes"}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setShowCreate(false);
              }}
            >
              {t("common.cancel")}
            </button>

            <button
              className="primary"
              onClick={createMeeting}
              disabled={saving || !title.trim() || !meetingAt}
            >
              {saving
                ? locale === "tr"
                  ? "Oluşturuluyor..."
                  : "Creating..."
                : locale === "tr"
                  ? "Toplantı Oluştur"
                  : "Create Meeting"}
            </button>
          </div>
        </div>
      ) : null}

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
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="muted">{locale === "tr" ? "Toplam" : "Total"}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{total}</div>
        </div>

        <div className="card">
          <div className="muted">{locale === "tr" ? "Yaklaşan" : "Upcoming"}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{upcomingCount}</div>
        </div>

        <div className="card">
          <div className="muted">{locale === "tr" ? "Geçmiş" : "Past"}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{pastCount}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 150px 180px 170px 170px 130px auto auto",
            gap: 10,
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              locale === "tr"
                ? "Başlık, müşteri, ajans, proje, kişi veya şirket ara..."
                : "Search title, customer, agency, project, contact or company..."
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />

          <select value={kind} onChange={(e) => setKind(e.target.value as MeetingKindFilter)}>
            {KIND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? locale === "tr"
                    ? "Tüm Türler"
                    : "All Types"
                  : kindLabel(option)}
              </option>
            ))}
          </select>

          <select
            value={responsibleFilterId}
            onChange={(e) => setResponsibleFilterId(e.target.value)}
            disabled={loadingRefs}
          >
            <option value="">
              {locale === "tr" ? "Tüm sorumlular" : "All responsible users"}
            </option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />

          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value={20}>20 / {t("agencies.perPage")}</option>
            <option value={50}>50 / {t("agencies.perPage")}</option>
            <option value={100}>100 / {t("agencies.perPage")}</option>
          </select>

          <button onClick={runSearch} disabled={loading}>
            {locale === "tr" ? "Ara" : "Search"}
          </button>

          <button onClick={clearFilters} disabled={loading}>
            {locale === "tr" ? "Temizle" : "Clear"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>{locale === "tr" ? "Toplantı" : "Meeting"}</th>
              <th>{locale === "tr" ? "Tür" : "Type"}</th>
              <th>{locale === "tr" ? "İlişkili" : "Related"}</th>
              <th>{locale === "tr" ? "Durum" : "Status"}</th>
              <th>{locale === "tr" ? "Sorumlu" : "Responsible"}</th>
              <th>{locale === "tr" ? "Tarih" : "Meeting Time"}</th>
              <th>{locale === "tr" ? "Oluşturan" : "Created By"}</th>
              <th>{locale === "tr" ? "İşlem" : "Actions"}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={`${item.kind}-${item.id}`}>
                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <Link
                      href={`/meetings/${item.id}?kind=${item.kind}`}
                      style={{
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                    >
                      {item.title}
                    </Link>

                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      {item.notes || "-"}
                    </div>
                  </div>
                </td>

                <td>
                  <span className={`badge ${kindBadgeClass(item.kind)}`}>
                    {kindLabel(item.kind)}
                  </span>
                </td>

                <td>
                  <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
                    {item.kind === "OTHER" ? (
                      <>
                        <b>{item.contactName || item.companyName || "-"}</b>
                        {item.companyName && item.contactName ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {item.companyName}
                          </span>
                        ) : null}
                        {item.phone ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {item.phone}
                          </span>
                        ) : null}
                        {item.email ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {item.email}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {item.agency ? (
                          <Link href={`/agencies/${item.agency.id}`}>{item.agency.name}</Link>
                        ) : null}

                        {item.customer ? (
                          <Link href={`/customers/${item.customer.id}`}>
                            {item.customer.fullName}
                          </Link>
                        ) : null}

                        {!item.agency && !item.customer ? "-" : null}

                        {item.projectName ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {item.projectName}
                          </span>
                        ) : null}

                        {item.location ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {item.location}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>

                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <span className={`badge ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>

                    {item.outcome ? (
                      <span className="muted" style={{ fontSize: 12 }}>
                        {outcomeLabel(item.outcome)}
                      </span>
                    ) : null}
                  </div>
                </td>

                <td>{item.assignedSales?.name || "-"}</td>

                <td>
                  <div
                    style={{
                      color: isPast(item.meetingAt) ? "var(--text-secondary)" : "inherit",
                      fontWeight: isPast(item.meetingAt) ? 500 : 800,
                    }}
                  >
                    {formatDateTime(item.meetingAt, locale)}
                  </div>
                </td>

                <td>{item.createdBy?.name || "-"}</td>

                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/meetings/${item.id}?kind=${item.kind}`}>
                      <button>{locale === "tr" ? "Detay" : "Detail"}</button>
                    </Link>

                    {canModify(item) ? (
                      <button
                        className="danger"
                        onClick={() => deleteMeeting(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id
                          ? locale === "tr"
                            ? "Siliniyor..."
                            : "Deleting..."
                          : locale === "tr"
                            ? "Sil"
                            : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {locale === "tr" ? "Toplantı bulunamadı." : "No meetings found."}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {pageInfo}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() =>
                load(Math.max(1, page - 1), kind, q, pageSize, from, to, responsibleFilterId)
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
                load(Math.min(totalPages, page + 1), kind, q, pageSize, from, to, responsibleFilterId)
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