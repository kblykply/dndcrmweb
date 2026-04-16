"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type MeetingKind = "AGENCY" | "PRESENTATION";
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

type SalesUserLite = {
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

type MeetingsResponse = {
  items: MeetingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const KIND_OPTIONS: MeetingKindFilter[] = ["ALL", "AGENCY", "PRESENTATION"];

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

function isPast(meetingAt?: string | null) {
  if (!meetingAt) return false;
  return new Date(meetingAt).getTime() < Date.now();
}

function formatDateTime(value?: string | null, locale: "tr" | "en" = "en") {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

export default function MeetingsPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<MeetingRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyLite[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUserLite[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [kind, setKind] = useState<MeetingKindFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  const role = me?.role as string | undefined;
  const canCreate = role === "ADMIN" || role === "MANAGER" || role === "SALES";

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

  async function load(
    nextPage = page,
    nextKind = kind,
    nextQ = q,
    nextPageSize = pageSize,
    nextFrom = from,
    nextTo = to,
  ) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextKind !== "ALL") params.set("kind", nextKind);
      if (nextFrom) params.set("from", new Date(nextFrom).toISOString());
      if (nextTo) params.set("to", new Date(nextTo).toISOString());

      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));

      const res = (await authedFetch(
        `/meetings?${params.toString()}`,
      )) as MeetingsResponse;

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

  async function createMeeting() {
    if (!title.trim() || !meetingAt) return;

    if (createKind === "AGENCY" && !agencyId) {
      setErr(
        locale === "tr"
          ? "Ajans toplantısı için ajans seçmelisiniz."
          : "You must select an agency for an agency meeting.",
      );
      return;
    }

    if (createKind === "PRESENTATION" && !customerId) {
      setErr(
        locale === "tr"
          ? "Sunum toplantısı için müşteri seçmelisiniz."
          : "You must select a customer for a presentation meeting.",
      );
      return;
    }

    setErr(null);
    setSaving(true);

    try {
      const body: any = {
        kind: createKind,
        title: title.trim(),
        notes: notes.trim() || undefined,
        meetingAt: new Date(meetingAt).toISOString(),
      };

      if (createKind === "AGENCY") {
        body.agencyId = agencyId;
      }

      if (createKind === "PRESENTATION") {
        body.customerId = customerId;
        body.assignedSalesId = assignedSalesId || undefined;
        body.projectName = projectName.trim() || undefined;
        body.location = location.trim() || undefined;
      }

      await authedFetch("/meetings", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setTitle("");
      setNotes("");
      setMeetingAt("");
      setAgencyId("");
      setCustomerId("");
      setAssignedSalesId("");
      setProjectName("");
      setLocation("");
      setCreateKind("AGENCY");
      setShowCreate(false);

      await load(1, kind, q, pageSize, from, to);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  function runSearch() {
    const trimmed = searchInput.trim();
    setQ(trimmed);
    load(1, kind, trimmed, pageSize, from, to);
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load(1, kind, q, pageSize, from, to);
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

  if (!mounted) {
    return <div>{t("common.loading")}</div>;
  }

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
            {safeTranslate(
              t,
              "meetings.subtitle",
              locale === "tr"
                ? "Ajans toplantıları ve sunum planlamalarını tek ekranda yönetin."
                : "Manage agency meetings and presentation schedules in one place.",
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => load(page, kind, q, pageSize, from, to)}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canCreate ? (
            <button
              className="primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate
                ? t("common.close")
                : safeTranslate(
                    t,
                    "meetings.newMeeting",
                    locale === "tr" ? "Yeni Toplantı" : "New Meeting",
                  )}
            </button>
          ) : null}
        </div>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "meetings.createTitle",
              locale === "tr" ? "Yeni Toplantı Oluştur" : "Create New Meeting",
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <select
              value={createKind}
              onChange={(e) => setCreateKind(e.target.value as MeetingKind)}
            >
              <option value="AGENCY">{kindLabel("AGENCY")}</option>
              <option value="PRESENTATION">{kindLabel("PRESENTATION")}</option>
            </select>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={safeTranslate(
                t,
                "meetings.fields.title",
                locale === "tr" ? "Toplantı başlığı" : "Meeting title",
              )}
            />

            <input
              type="datetime-local"
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
            />

            {createKind === "AGENCY" ? (
              <select
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
                disabled={loadingRefs}
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
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={loadingRefs}
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
            )}

            {createKind === "PRESENTATION" ? (
              <select
                value={assignedSalesId}
                onChange={(e) => setAssignedSalesId(e.target.value)}
                disabled={loadingRefs}
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
            ) : (
              <div />
            )}

            {createKind === "PRESENTATION" ? (
              <>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={safeTranslate(
                    t,
                    "meetings.fields.projectName",
                    locale === "tr" ? "Proje adı" : "Project name",
                  )}
                />

                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={safeTranslate(
                    t,
                    "meetings.fields.location",
                    locale === "tr" ? "Lokasyon" : "Location",
                  )}
                />
              </>
            ) : null}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={safeTranslate(
              t,
              "meetings.fields.notes",
              locale === "tr" ? "Notlar" : "Notes",
            )}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowCreate(false)}>
              {t("common.cancel")}
            </button>

            <button
              className="primary"
              onClick={createMeeting}
              disabled={
                saving ||
                !title.trim() ||
                !meetingAt ||
                (createKind === "AGENCY" && !agencyId) ||
                (createKind === "PRESENTATION" && !customerId)
              }
            >
              {saving
                ? safeTranslate(
                    t,
                    "meetings.creating",
                    locale === "tr" ? "Oluşturuluyor..." : "Creating...",
                  )
                : safeTranslate(
                    t,
                    "meetings.createMeeting",
                    locale === "tr" ? "Toplantı Oluştur" : "Create Meeting",
                  )}
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
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.stats.total",
              locale === "tr" ? "Toplam" : "Total",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{total}</div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.stats.upcoming",
              locale === "tr" ? "Yaklaşan" : "Upcoming",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{upcomingCount}</div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "meetings.stats.past",
              locale === "tr" ? "Geçmiş" : "Past",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{pastCount}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 180px 180px 180px 140px auto",
            gap: 10,
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={safeTranslate(
              t,
              "meetings.searchPlaceholder",
              locale === "tr"
                ? "Başlık, müşteri, ajans, proje ara..."
                : "Search title, customer, agency, project...",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />

          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MeetingKindFilter)}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? safeTranslate(
                      t,
                      "meetings.allKinds",
                      locale === "tr" ? "Tüm Türler" : "All Types",
                    )
                  : kindLabel(option)}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={20}>20 / {t("agencies.perPage")}</option>
            <option value={50}>50 / {t("agencies.perPage")}</option>
            <option value={100}>100 / {t("agencies.perPage")}</option>
          </select>

          <button onClick={runSearch} disabled={loading}>
            {safeTranslate(
              t,
              "meetings.searchAndRefresh",
              locale === "tr" ? "Ara / Yenile" : "Search / Refresh",
            )}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.title",
                  locale === "tr" ? "Toplantı" : "Meeting",
                )}
              </th>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.kind",
                  locale === "tr" ? "Tür" : "Type",
                )}
              </th>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.related",
                  locale === "tr" ? "İlişkili" : "Related",
                )}
              </th>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.sales",
                  locale === "tr" ? "Satış" : "Sales",
                )}
              </th>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.meetingAt",
                  locale === "tr" ? "Tarih" : "Meeting Time",
                )}
              </th>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.createdBy",
                  locale === "tr" ? "Oluşturan" : "Created By",
                )}
              </th>
              <th>
                {safeTranslate(
                  t,
                  "meetings.table.actions",
                  locale === "tr" ? "İşlem" : "Actions",
                )}
              </th>
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
                    {item.kind === "AGENCY" ? (
                      item.agency ? (
                        <Link href={`/agencies/${item.agency.id}`}>
                          {item.agency.name}
                        </Link>
                      ) : (
                        "-"
                      )
                    ) : (
                      <>
                        {item.customer ? (
                          <Link href={`/customers/${item.customer.id}`}>
                            {item.customer.fullName}
                          </Link>
                        ) : (
                          "-"
                        )}

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

                <td>{item.assignedSales?.name || "-"}</td>

                <td>
                  <div
                    style={{
                      color: isPast(item.meetingAt)
                        ? "var(--text-secondary)"
                        : "inherit",
                      fontWeight: isPast(item.meetingAt) ? 500 : 800,
                    }}
                  >
                    {formatDateTime(item.meetingAt, locale)}
                  </div>
                </td>

                <td>{item.createdBy?.name || "-"}</td>

                <td>
                  <Link href={`/meetings/${item.id}?kind=${item.kind}`}>
                    <button>
                      {safeTranslate(
                        t,
                        "meetings.openDetail",
                        locale === "tr" ? "Detay Aç" : "Open Detail",
                      )}
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {safeTranslate(
              t,
              "meetings.noMeetings",
              locale === "tr" ? "Toplantı bulunamadı." : "No meetings found.",
            )}
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
                load(Math.max(1, page - 1), kind, q, pageSize, from, to)
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
                load(Math.min(totalPages, page + 1), kind, q, pageSize, from, to)
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