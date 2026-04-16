"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type MeetingKind = "AGENCY" | "PRESENTATION";

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

  agency?: {
    id: string;
    name: string;
  } | null;

  customer?: {
    id: string;
    fullName: string;
    companyName?: string | null;
  } | null;

  assignedSales?: {
    id: string;
    name: string;
    email: string;
  } | null;

  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;

  projectName?: string | null;
  location?: string | null;
};

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function kindBadgeClass(kind?: string) {
  if (kind === "AGENCY") return "info";
  if (kind === "PRESENTATION") return "success";
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

function normalizeErrorMessage(
  input: unknown,
  locale: "tr" | "en",
) {
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

  if (text.includes("No access")) {
    return locale === "tr"
      ? "Bu kayıt için yetkiniz yok."
      : "You do not have access to this record.";
  }

  if (text.includes("not found") || text.includes("Not found")) {
    return locale === "tr"
      ? "Kayıt bulunamadı."
      : "Record not found.";
  }

  return text;
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
    rawKind === "PRESENTATION" ? "PRESENTATION" : "AGENCY";

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

  const role = me?.role as string | undefined;
  const canManage =
    role === "ADMIN" || role === "MANAGER" || role === "SALES";

  function kindLabel(value?: string | null) {
    if (!value) return "-";

    return safeTranslate(
      t,
      `meetings.kinds.${value}`,
      value === "AGENCY"
        ? locale === "tr"
          ? "Ajans"
          : "Agency"
        : locale === "tr"
          ? "Sunum"
          : "Presentation",
    );
  }

  async function loadMeeting() {
    if (!meetingId) {
      setErr(
        locale === "tr" ? "Toplantı ID bulunamadı." : "Meeting ID not found.",
      );
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
    } catch (e: any) {
      setMeeting(null);
      setErr(normalizeErrorMessage(e?.message || e, locale));
    } finally {
      setLoading(false);
    }
  }

  async function loadRefs() {
    if (!canManage) return;

    setLoadingRefs(true);

    try {
      const [agenciesRes, customersRes, salesRes] = await Promise.all([
        authedFetch("/agencies?page=1&pageSize=300"),
        authedFetch("/customers"),
        authedFetch("/users?role=SALES"),
      ]);

      setAgencies(Array.isArray(agenciesRes?.items) ? agenciesRes.items : []);
      setCustomers(Array.isArray(customersRes) ? customersRes : []);
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
    if (!meeting || !meetingId || !canManage) return;

    setErr(null);
    setSaving(true);

    try {
      const body: any = {
        title: title.trim(),
        notes: notes.trim() || null,
        meetingAt: meetingAt ? new Date(meetingAt).toISOString() : null,
      };

      if (meeting.kind === "AGENCY") {
        body.agencyId = agencyId || null;
      }

      if (meeting.kind === "PRESENTATION") {
        body.customerId = customerId || null;
        body.assignedSalesId = assignedSalesId || null;
        body.projectName = projectName.trim() || null;
        body.location = location.trim() || null;
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
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, locale));
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeeting() {
    if (!meeting || !meetingId || !canManage) return;

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

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, meetingId, meetingKind]);

  useEffect(() => {
    if (!mounted || !canManage) return;
    loadRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, canManage]);

  const relatedBlock = useMemo(() => {
    if (!meeting) return null;

    if (meeting.kind === "AGENCY") {
      return meeting.agency ? (
        <Link href={`/agencies/${meeting.agency.id}`}>{meeting.agency.name}</Link>
      ) : (
        "-"
      );
    }

    return (
      <div style={{ display: "grid", gap: 4 }}>
        {meeting.customer ? (
          <Link href={`/customers/${meeting.customer.id}`}>
            {meeting.customer.fullName}
          </Link>
        ) : (
          <span>-</span>
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

  if (!mounted) {
    return <div>{t("common.loading")}</div>;
  }

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
            ←{" "}
            {safeTranslate(
              t,
              "meetings.backToMeetings",
              locale === "tr" ? "Toplantılara Dön" : "Back to Meetings",
            )}
          </Link>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{meeting.title}</div>
            <span className={`badge ${kindBadgeClass(meeting.kind)}`}>
              {kindLabel(meeting.kind)}
            </span>
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "meetings.detail.createdAt",
              locale === "tr" ? "Oluşturulma" : "Created",
            )}
            : {formatDateTime(meeting.createdAt, locale)}
          </div>
        </div>

        {canManage ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="primary"
              onClick={saveMeeting}
              disabled={saving || deleting || !title.trim() || !meetingAt}
            >
              {saving
                ? safeTranslate(
                    t,
                    "common.saving",
                    locale === "tr" ? "Kaydediliyor..." : "Saving...",
                  )
                : t("common.save")}
            </button>

            <button
              className="danger"
              onClick={deleteMeeting}
              disabled={saving || deleting}
            >
              {deleting
                ? safeTranslate(
                    t,
                    "common.deleting",
                    locale === "tr" ? "Siliniyor..." : "Deleting...",
                  )
                : t("common.delete")}
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
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.detail.meetingAt",
              locale === "tr" ? "Toplantı Tarihi" : "Meeting Time",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(meeting.meetingAt, locale)}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.detail.related",
              locale === "tr" ? "İlişkili Kayıt" : "Related Record",
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{relatedBlock}</div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.detail.sales",
              locale === "tr" ? "Satış" : "Sales",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {meeting.assignedSales?.name || "-"}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.detail.createdBy",
              locale === "tr" ? "Oluşturan" : "Created By",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {meeting.createdBy?.name || "-"}
          </div>
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
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "meetings.detail.meetingInfo",
              locale === "tr" ? "Toplantı Bilgileri" : "Meeting Information",
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "meetings.fields.title",
                  locale === "tr" ? "Başlık" : "Title",
                )}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canManage}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "meetings.fields.kind",
                  locale === "tr" ? "Tür" : "Type",
                )}
              </label>
              <input value={kindLabel(meeting.kind)} disabled />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "meetings.fields.meetingAt",
                  locale === "tr" ? "Toplantı Tarihi" : "Meeting Time",
                )}
              </label>
              <input
                type="datetime-local"
                value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)}
                disabled={!canManage}
              />
            </div>

            {meeting.kind === "AGENCY" ? (
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {safeTranslate(
                    t,
                    "meetings.fields.selectAgency",
                    locale === "tr" ? "Ajans" : "Agency",
                  )}
                </label>
                <select
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                  disabled={!canManage || loadingRefs}
                >
                  <option value="">
                    {safeTranslate(
                      t,
                      "meetings.fields.selectAgency",
                      locale === "tr" ? "Ajans seç" : "Select agency",
                    )}
                  </option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {safeTranslate(
                    t,
                    "meetings.fields.selectCustomer",
                    locale === "tr" ? "Müşteri" : "Customer",
                  )}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={!canManage || loadingRefs}
                >
                  <option value="">
                    {safeTranslate(
                      t,
                      "meetings.fields.selectCustomer",
                      locale === "tr" ? "Müşteri seç" : "Select customer",
                    )}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                      {c.companyName ? ` (${c.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {meeting.kind === "PRESENTATION" ? (
              <>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {safeTranslate(
                      t,
                      "meetings.fields.selectSales",
                      locale === "tr" ? "Satış Temsilcisi" : "Sales Rep",
                    )}
                  </label>
                  <select
                    value={assignedSalesId}
                    onChange={(e) => setAssignedSalesId(e.target.value)}
                    disabled={!canManage || loadingRefs}
                  >
                    <option value="">
                      {safeTranslate(
                        t,
                        "meetings.fields.selectSales",
                        locale === "tr"
                          ? "Satış temsilcisi seç"
                          : "Select sales rep",
                      )}
                    </option>
                    {salesUsers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {safeTranslate(
                      t,
                      "meetings.fields.projectName",
                      locale === "tr" ? "Proje Adı" : "Project Name",
                    )}
                  </label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={!canManage}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {safeTranslate(
                      t,
                      "meetings.fields.location",
                      locale === "tr" ? "Lokasyon" : "Location",
                    )}
                  </label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!canManage}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {safeTranslate(
                t,
                "meetings.fields.notes",
                locale === "tr" ? "Notlar" : "Notes",
              )}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canManage}
              style={{ minHeight: 160 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>
              {safeTranslate(
                t,
                "meetings.detail.meta",
                locale === "tr" ? "Kayıt Bilgileri" : "Record Details",
              )}
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
                <b>
                  {safeTranslate(
                    t,
                    "meetings.detail.kind",
                    locale === "tr" ? "Tür" : "Type",
                  )}
                  :
                </b>{" "}
                {kindLabel(meeting.kind)}
              </div>

              <div>
                <b>
                  {safeTranslate(
                    t,
                    "meetings.detail.createdAt",
                    locale === "tr" ? "Oluşturulma" : "Created",
                  )}
                  :
                </b>{" "}
                {formatDateTime(meeting.createdAt, locale)}
              </div>

              <div>
                <b>
                  {safeTranslate(
                    t,
                    "meetings.detail.updatedAt",
                    locale === "tr" ? "Güncellenme" : "Updated",
                  )}
                  :
                </b>{" "}
                {formatDateTime(meeting.updatedAt, locale)}
              </div>

              <div>
                <b>
                  {safeTranslate(
                    t,
                    "meetings.detail.createdBy",
                    locale === "tr" ? "Oluşturan" : "Created By",
                  )}
                  :
                </b>{" "}
                {meeting.createdBy?.name || "-"}
              </div>

              <div>
                <b>
                  {safeTranslate(
                    t,
                    "meetings.detail.sales",
                    locale === "tr" ? "Satış" : "Sales",
                  )}
                  :
                </b>{" "}
                {meeting.assignedSales?.name || "-"}
              </div>
            </div>

            <Link href="/meetings">
              <button style={{ width: "100%" }}>
                {safeTranslate(
                  t,
                  "meetings.backToMeetings",
                  locale === "tr" ? "Toplantılara Dön" : "Back to Meetings",
                )}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}