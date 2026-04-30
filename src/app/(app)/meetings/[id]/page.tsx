"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type MeetingKind = "AGENCY" | "PRESENTATION" | "OTHER";

type AgencyLite = {
  id: string;
  name: string;
};

type CustomerLite = {
  id: string;
  fullName: string;
  companyName?: string | null;
};

type SalesUserLite = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type MeetingDetail = {
  id: string;
  kind: MeetingKind;
  title: string;
  notes?: string | null;
  meetingAt: string;
  createdAt?: string;
  updatedAt?: string;

  agency?: { id: string; name: string } | null;
  customer?: { id: string; fullName: string; companyName?: string | null } | null;
  assignedSales?: { id: string; name: string; email: string } | null;
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

const MEETING_STATUS = ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"];

const MEETING_OUTCOME = [
  "",
  "POSITIVE",
  "NEGATIVE",
  "FOLLOW_UP",
  "NO_DECISION",
  "WON",
  "LOST",
];

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
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

function toDatetimeLocalValue(date?: string | null) {
  if (!date) return "";

  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function formatDateTime(value?: string | null, locale: "tr" | "en" = "en") {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

function normalizeErrorMessage(input: unknown, locale: "tr" | "en") {
  const text = String(input || "");

  if (
    text.includes("Internal server error") ||
    text.includes("P2028") ||
    text.includes("Unable to start a transaction") ||
    text.includes("Transaction API error") ||
    text.includes("timeout exceeded when trying to connect")
  ) {
    return locale === "tr"
      ? "Sunucu şu anda yoğun, lütfen tekrar deneyin."
      : "Server is busy right now, please try again.";
  }

  if (text.includes("Unauthorized")) {
    return locale === "tr" ? "Oturum süresi doldu." : "Session expired.";
  }

  if (text.includes("No access") || text.includes("Only creator")) {
    return locale === "tr"
      ? "Bu kayıt için yetkiniz yok."
      : "You do not have access to this record.";
  }

  if (text.includes("not found") || text.includes("Not found")) {
    return locale === "tr" ? "Kayıt bulunamadı." : "Record not found.";
  }

  return text;
}

function optionMatch(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export default function MeetingDetailPage() {
  const { t, locale } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = (params as any)?.id as string | string[] | undefined;
  const meetingId = Array.isArray(rawId) ? rawId[0] : rawId;

  const rawKind = searchParams.get("kind");
  const meetingKind: MeetingKind =
    rawKind === "PRESENTATION"
      ? "PRESENTATION"
      : rawKind === "OTHER"
        ? "OTHER"
        : "AGENCY";

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [agencies, setAgencies] = useState<AgencyLite[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUserLite[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
  const [status, setStatus] = useState("SCHEDULED");
  const [outcome, setOutcome] = useState("");

  const [agencySearch, setAgencySearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");

  const role = me?.role as string | undefined;

  function canModify() {
    if (!meeting || !me) return false;
    if (role === "ADMIN" || role === "MANAGER") return true;
    return meeting.createdBy?.id === me.id;
  }

  const canEdit = canModify();

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
    if (!value) return locale === "tr" ? "Sonuç yok" : "No outcome";

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
      .filter((c) =>
        optionMatch(`${c.fullName} ${c.companyName || ""}`, customerSearch),
      )
      .slice(0, 80);
  }, [customers, customerSearch]);

  const filteredSalesUsers = useMemo(() => {
    if (!salesSearch.trim()) return salesUsers.slice(0, 80);

    return salesUsers
      .filter((s) => optionMatch(`${s.name} ${s.email}`, salesSearch))
      .slice(0, 80);
  }, [salesUsers, salesSearch]);

  async function loadMeeting() {
    if (!meetingId) {
      setErr(locale === "tr" ? "Toplantı ID bulunamadı." : "Meeting ID not found.");
      setMeeting(null);
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const data = (await authedFetch(
        `/meetings/${meetingKind}/${meetingId}`,
      )) as MeetingDetail;

      setMeeting(data);
      setTitle(data?.title || "");
      setNotes(data?.notes || "");
      setMeetingAt(toDatetimeLocalValue(data?.meetingAt));
      setAgencyId(data?.agency?.id || "");
      setCustomerId(data?.customer?.id || "");
      setAssignedSalesId(data?.assignedSales?.id || "");
      setProjectName(data?.projectName || "");
      setLocation(data?.location || "");
      setContactName(data?.contactName || "");
      setCompanyName(data?.companyName || "");
      setPhone(data?.phone || "");
      setEmail(data?.email || "");
      setStatus(data?.status || "SCHEDULED");
      setOutcome(data?.outcome || "");

      setAgencySearch(data?.agency?.name || "");
      setCustomerSearch(
        data?.customer
          ? `${data.customer.fullName}${data.customer.companyName ? ` (${data.customer.companyName})` : ""}`
          : "",
      );
      setSalesSearch(data?.assignedSales?.name || "");
    } catch (e: any) {
      setMeeting(null);
      setErr(normalizeErrorMessage(e?.message || e, locale));
    } finally {
      setLoading(false);
    }
  }

  async function loadRefs() {
    setLoadingRefs(true);

    try {
      const [agenciesRes, customersRes, salesRes] = await Promise.all([
        authedFetch("/agencies?page=1&pageSize=500"),
        authedFetch("/customers?page=1&pageSize=500"),
        authedFetch("/users?role=SALES"),
      ]);

      setAgencies(Array.isArray(agenciesRes?.items) ? agenciesRes.items : []);
      setCustomers(
        Array.isArray(customersRes?.items)
          ? customersRes.items
          : Array.isArray(customersRes)
            ? customersRes
            : [],
      );
      setSalesUsers(Array.isArray(salesRes) ? salesRes : []);
    } catch {
      setAgencies([]);
      setCustomers([]);
      setSalesUsers([]);
    } finally {
      setLoadingRefs(false);
    }
  }

  async function saveMeeting() {
    if (!meeting || !meetingId || !canEdit) return;

    setErr(null);
    setSaving(true);

    try {
      const body: any = {
        title: title.trim(),
        notes: notes.trim() || null,
        meetingAt: meetingAt ? new Date(meetingAt).toISOString() : null,
        assignedSalesId: role === "SALES" ? me?.id : assignedSalesId || null,
        status,
        outcome: outcome || null,
      };

      if (meeting.kind === "AGENCY") {
        body.agencyId = agencyId || null;
        body.customerId = customerId || null;
      }

      if (meeting.kind === "PRESENTATION") {
        body.agencyId = agencyId || null;
        body.customerId = customerId || null;
        body.projectName = projectName.trim() || null;
        body.location = location.trim() || null;
      }

      if (meeting.kind === "OTHER") {
        body.contactName = contactName.trim() || null;
        body.companyName = companyName.trim() || null;
        body.phone = phone.trim() || null;
        body.email = email.trim() || null;
      }

      const updated = (await authedFetch(
        `/meetings/${meeting.kind}/${meetingId}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      )) as MeetingDetail;

      setMeeting(updated);
      setTitle(updated?.title || "");
      setNotes(updated?.notes || "");
      setMeetingAt(toDatetimeLocalValue(updated?.meetingAt));
      setAgencyId(updated?.agency?.id || "");
      setCustomerId(updated?.customer?.id || "");
      setAssignedSalesId(updated?.assignedSales?.id || "");
      setProjectName(updated?.projectName || "");
      setLocation(updated?.location || "");
      setContactName(updated?.contactName || "");
      setCompanyName(updated?.companyName || "");
      setPhone(updated?.phone || "");
      setEmail(updated?.email || "");
      setStatus(updated?.status || "SCHEDULED");
      setOutcome(updated?.outcome || "");
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, locale));
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeeting() {
    if (!meeting || !meetingId || !canEdit) return;

    const confirmed = window.confirm(
      locale === "tr"
        ? "Bu toplantıyı silmek istediğinize emin misiniz?"
        : "Are you sure you want to delete this meeting?",
    );

    if (!confirmed) return;

    setErr(null);
    setDeleting(true);

    try {
      await authedFetch(`/meetings/${meeting.kind}/${meetingId}`, {
        method: "DELETE",
      });

      router.push("/meetings");
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, locale));
    } finally {
      setDeleting(false);
    }
  }

  const relatedBlock = useMemo(() => {
    if (!meeting) return null;

    if (meeting.kind === "OTHER") {
      return (
        <div style={{ display: "grid", gap: 4 }}>
          <span>{meeting.contactName || "-"}</span>
          {meeting.companyName ? <span className="muted">{meeting.companyName}</span> : null}
          {meeting.phone ? <span className="muted">{meeting.phone}</span> : null}
          {meeting.email ? <span className="muted">{meeting.email}</span> : null}
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 4 }}>
        {meeting.agency ? (
          <Link href={`/agencies/${meeting.agency.id}`}>{meeting.agency.name}</Link>
        ) : (
          <span>-</span>
        )}

        {meeting.customer ? (
          <Link href={`/customers/${meeting.customer.id}`} className="muted">
            {meeting.customer.fullName}
          </Link>
        ) : (
          <span className="muted">-</span>
        )}

        {meeting.projectName ? (
          <span className="muted" style={{ fontSize: 12 }}>
            {meeting.projectName}
          </span>
        ) : null}

        {meeting.location ? (
          <span className="muted" style={{ fontSize: 12 }}>
            {meeting.location}
          </span>
        ) : null}
      </div>
    );
  }, [meeting]);

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadMeeting();
    loadRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, meetingId, meetingKind]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  if (loading) {
    return (
      <div className="card">
        {safeTranslate(
          t,
          "meetings.loadingDetail",
          locale === "tr" ? "Toplantı yükleniyor..." : "Loading meeting...",
        )}
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {safeTranslate(
            t,
            "meetings.notFoundTitle",
            locale === "tr" ? "Toplantı Bulunamadı" : "Meeting Not Found",
          )}
        </div>
        <div className="muted">
          {err ||
            safeTranslate(
              t,
              "meetings.notFoundText",
              locale === "tr"
                ? "Bu toplantı kaydı bulunamadı."
                : "This meeting record could not be found.",
            )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <Link href="/meetings" style={{ fontWeight: 800 }}>
            ← {locale === "tr" ? "Toplantılara Dön" : "Back to Meetings"}
          </Link>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{meeting.title}</div>

            <span className={`badge ${kindBadgeClass(meeting.kind)}`}>
              {kindLabel(meeting.kind)}
            </span>

            <span className={`badge ${statusBadgeClass(meeting.status)}`}>
              {statusLabel(meeting.status)}
            </span>

            {meeting.outcome ? (
              <span className="badge success">{outcomeLabel(meeting.outcome)}</span>
            ) : null}
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            {locale === "tr" ? "Oluşturulma" : "Created"}:{" "}
            {formatDateTime(meeting.createdAt, locale)}
          </div>

          {!canEdit ? (
            <div className="muted" style={{ fontSize: 13 }}>
              {locale === "tr"
                ? "Bu kaydı sadece oluşturan kişi, manager veya admin düzenleyebilir."
                : "Only the creator, manager or admin can edit this record."}
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="primary"
              onClick={saveMeeting}
              disabled={saving || deleting || !title.trim() || !meetingAt}
            >
              {saving ? (locale === "tr" ? "Kaydediliyor..." : "Saving...") : t("common.save")}
            </button>

            <button className="danger" onClick={deleteMeeting} disabled={saving || deleting}>
              {deleting ? (locale === "tr" ? "Siliniyor..." : "Deleting...") : t("common.delete")}
            </button>
          </div>
        ) : null}
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
          <div className="muted">{locale === "tr" ? "Toplantı Tarihi" : "Meeting Time"}</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(meeting.meetingAt, locale)}
          </div>
        </div>

        <div className="card">
          <div className="muted">{locale === "tr" ? "Durum" : "Status"}</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {statusLabel(meeting.status)}
          </div>
        </div>

        <div className="card">
          <div className="muted">{locale === "tr" ? "Satış" : "Sales"}</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {meeting.assignedSales?.name || "-"}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {meeting.kind === "OTHER"
              ? locale === "tr"
                ? "İlgili Kişi"
                : "Contact"
              : locale === "tr"
                ? "İlişkili Kayıt"
                : "Related"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{relatedBlock}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900 }}>
              {locale === "tr" ? "Toplantı Bilgileri" : "Meeting Information"}
            </div>
            {loadingRefs ? (
              <div className="muted" style={{ fontSize: 12 }}>
                {t("common.loading")}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label className="muted" style={{ fontSize: 12 }}>
                {locale === "tr" ? "Başlık" : "Title"}
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label className="muted" style={{ fontSize: 12 }}>
                {locale === "tr" ? "Tür" : "Type"}
              </label>
              <input value={kindLabel(meeting.kind)} disabled />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label className="muted" style={{ fontSize: 12 }}>
                {locale === "tr" ? "Toplantı Tarihi" : "Meeting Time"}
              </label>
              <input
                type="datetime-local"
                value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label className="muted" style={{ fontSize: 12 }}>
                {locale === "tr" ? "Durum" : "Status"}
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit}>
                {MEETING_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label className="muted" style={{ fontSize: 12 }}>
                {locale === "tr" ? "Sonuç" : "Outcome"}
              </label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} disabled={!canEdit}>
                {MEETING_OUTCOME.map((o) => (
                  <option key={o || "EMPTY"} value={o}>
                    {outcomeLabel(o)}
                  </option>
                ))}
              </select>
            </div>

            {meeting.kind !== "OTHER" ? (
              <>
                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Ajans Ara" : "Search Agency"}
                  </label>
                  <input
                    value={agencySearch}
                    onChange={(e) => setAgencySearch(e.target.value)}
                    disabled={!canEdit || loadingRefs}
                    placeholder={locale === "tr" ? "Ajans ara..." : "Search agency..."}
                  />
                  <select
                    value={agencyId}
                    onChange={(e) => setAgencyId(e.target.value)}
                    disabled={!canEdit || loadingRefs}
                  >
                    <option value="">
                      {locale === "tr" ? "Ajans seçmeden devam et" : "Continue without agency"}
                    </option>
                    {filteredAgencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Müşteri Ara" : "Search Customer"}
                  </label>
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    disabled={!canEdit || loadingRefs}
                    placeholder={locale === "tr" ? "Müşteri ara..." : "Search customer..."}
                  />
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={!canEdit || loadingRefs}
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
                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Kişi Adı" : "Contact Name"}
                  </label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Şirket / Kurum" : "Company / Organization"}
                  </label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Telefon" : "Phone"}
                  </label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "E-posta" : "Email"}
                  </label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
                </div>
              </>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              <label className="muted" style={{ fontSize: 12 }}>
                {locale === "tr" ? "Satış Temsilcisi" : "Sales Rep"}
              </label>

              {role === "SALES" ? (
                <input value={me?.name || ""} disabled />
              ) : (
                <>
                  <input
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    disabled={!canEdit || loadingRefs}
                    placeholder={locale === "tr" ? "Satış temsilcisi ara..." : "Search sales rep..."}
                  />
                  <select
                    value={assignedSalesId}
                    onChange={(e) => setAssignedSalesId(e.target.value)}
                    disabled={!canEdit || loadingRefs}
                  >
                    <option value="">
                      {locale === "tr"
                        ? "Satış temsilcisi seçmeden devam et"
                        : "Continue without sales rep"}
                    </option>

                    {filteredSalesUsers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {meeting.kind === "PRESENTATION" ? (
              <>
                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Proje Adı" : "Project Name"}
                  </label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label className="muted" style={{ fontSize: 12 }}>
                    {locale === "tr" ? "Lokasyon" : "Location"}
                  </label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>
              {locale === "tr" ? "Notlar" : "Notes"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
              style={{ minHeight: 160 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>
              {locale === "tr" ? "Kayıt Bilgileri" : "Record Details"}
            </div>

            <div
              style={{
                border: "1px solid var(--stroke)",
                borderRadius: 12,
                padding: 12,
                background: "var(--surface-2)",
                display: "grid",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div>
                <b>ID:</b> {meeting.id}
              </div>

              <div>
                <b>{locale === "tr" ? "Tür" : "Type"}:</b> {kindLabel(meeting.kind)}
              </div>

              <div>
                <b>{locale === "tr" ? "Durum" : "Status"}:</b>{" "}
                {statusLabel(meeting.status)}
              </div>

              <div>
                <b>{locale === "tr" ? "Sonuç" : "Outcome"}:</b>{" "}
                {outcomeLabel(meeting.outcome)}
              </div>

              {meeting.kind === "OTHER" ? (
                <>
                  <div>
                    <b>{locale === "tr" ? "Kişi" : "Contact"}:</b>{" "}
                    {meeting.contactName || "-"}
                  </div>
                  <div>
                    <b>{locale === "tr" ? "Şirket" : "Company"}:</b>{" "}
                    {meeting.companyName || "-"}
                  </div>
                </>
              ) : null}

              <div>
                <b>{locale === "tr" ? "Oluşturulma" : "Created"}:</b>{" "}
                {formatDateTime(meeting.createdAt, locale)}
              </div>

              <div>
                <b>{locale === "tr" ? "Güncellenme" : "Updated"}:</b>{" "}
                {formatDateTime(meeting.updatedAt, locale)}
              </div>

              <div>
                <b>{locale === "tr" ? "Oluşturan" : "Created By"}:</b>{" "}
                {meeting.createdBy?.name || "-"}
              </div>

              <div>
                <b>{locale === "tr" ? "Satış" : "Sales"}:</b>{" "}
                {meeting.assignedSales?.name || "-"}
              </div>
            </div>

            <Link href="/meetings">
              <button style={{ width: "100%" }}>
                {locale === "tr" ? "Toplantılara Dön" : "Back to Meetings"}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}