"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

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
  owner?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  canSeeContactDetails?: boolean;
  canEdit?: boolean;
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

const CUSTOMER_TYPE_OPTIONS: Array<"POTENTIAL" | "EXISTING"> = [
  "POTENTIAL",
  "EXISTING",
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

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

export default function CustomerDetailPage() {
  const { t, locale } = useLanguage();

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

  // customer editable fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [customerNotesSummary, setCustomerNotesSummary] = useState("");
  const [customerType, setCustomerType] = useState<"POTENTIAL" | "EXISTING">(
    "POTENTIAL",
  );

  const role = me?.role as string | undefined;
  const isSales = role === "SALES";
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";

  const canSeeContactDetails = useMemo(() => {
    if (!customer) return false;
    if (isManagerOrAdmin) return true;
    if (!isSales) return true;
    return customer.canSeeContactDetails === true;
  }, [customer, isManagerOrAdmin, isSales]);

  const canEditCustomer = useMemo(() => {
    if (!customer) return false;
    if (isManagerOrAdmin) return true;
    if (!isSales) return false;
    return customer.canEdit === true;
  }, [customer, isManagerOrAdmin, isSales]);

  const canCreatePresentation = canEditCustomer;

  function hiddenText() {
    return safeTranslate(
      t,
      "common.hidden",
      locale === "tr" ? "Gizli" : "Hidden",
    );
  }

  function formatDateTime(date?: string | null) {
    if (!date) return "-";
    return new Date(date).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
  }

  function fillCustomerForm(data: CustomerDetail) {
    setFullName(data.fullName || "");
    setCompanyName(data.companyName || "");
    setPhone(data.phone || "");
    setEmail(data.email || "");
    setCity(data.city || "");
    setCountry(data.country || "");
    setAddress(data.address || "");
    setSource(data.source || "");
    setCustomerNotesSummary(data.notesSummary || "");
    setCustomerType((data.type as "POTENTIAL" | "EXISTING") || "POTENTIAL");
  }

  async function loadCustomer() {
    if (!customerId) {
      setErr(t("customerDetail.customerIdMissing"));
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const customerData = await authedFetch(`/customers/${customerId}`);
      setCustomer(customerData);
      fillCustomerForm(customerData);
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

  async function saveCustomer() {
    if (!customer || !canEditCustomer || !fullName.trim()) return;

    setErr(null);
    setSaving(true);

    try {
      await authedFetch(`/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim(),
          companyName: companyName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          address: address.trim() || null,
          source: source.trim() || null,
          notesSummary: customerNotesSummary.trim() || null,
          type: customerType,
        }),
      });

      await loadCustomer();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function createPresentation() {
    if (!customer || !title.trim() || !presentationAt || !canCreatePresentation) {
      return;
    }

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
    if (!note || !canEditCustomer) return;

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
    if (!canEditCustomer) return;

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

  if (!mounted) return <div>{t("common.loading")}</div>;
  if (loading) return <div className="card">{t("customerDetail.loadingCustomer")}</div>;

  if (!customer) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {t("customerDetail.notFoundTitle")}
        </div>
        <div className="muted">{err || t("customerDetail.notFoundText")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <a href="/customers" style={{ fontWeight: 800 }}>
            ← {t("customerDetail.backToCustomers")}
          </a>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{customer.fullName}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {customer.companyName || "-"} •{" "}
            {customer.agency?.name || t("customerDetail.noAgency")}
          </div>
        </div>

        <span
          className={`badge ${
            customer.type === "EXISTING" ? "success" : "info"
          }`}
        >
          {customer.type
            ? safeTranslate(t, `customerTypes.${customer.type}`, customer.type)
            : "-"}
        </span>
      </div>

      {isSales && !canSeeContactDetails ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(245,158,11,.35)",
            background: "rgba(245,158,11,.08)",
          }}
        >
          {safeTranslate(
            t,
            "customerDetail.limitedAccessNotice",
            locale === "tr"
              ? "Bu müşteri size ait olmadığı için iletişim bilgileri gizlenmiştir ve düzenleme yapamazsınız."
              : "Contact details are hidden and you cannot edit this customer because it does not belong to you.",
          )}
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
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="muted">{t("customerDetail.stats.totalPresentations")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.total}</div>
        </div>
        <div className="card">
          <div className="muted">{t("customerDetail.stats.scheduled")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.scheduled}</div>
        </div>
        <div className="card">
          <div className="muted">{t("customerDetail.stats.completed")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.completed}</div>
        </div>
        <div className="card">
          <div className="muted">{t("customerDetail.stats.won")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.won}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>{t("customerDetail.customerInfo")}</div>

          {canEditCustomer ? (
            <button
              className="primary"
              onClick={saveCustomer}
              disabled={saving || !fullName.trim()}
            >
              {saving ? t("customerDetail.saving") : safeTranslate(t, "customerDetail.saveCustomer", locale === "tr" ? "Müşteriyi Kaydet" : "Save Customer")}
            </button>
          ) : null}
        </div>

        {canEditCustomer ? (
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
              placeholder={safeTranslate(t, "customers.fields.fullName", "Full Name")}
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.companyName", "Company")}
            />
            <select
              value={customerType}
              onChange={(e) =>
                setCustomerType(e.target.value as "POTENTIAL" | "EXISTING")
              }
            >
              {CUSTOMER_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {safeTranslate(t, `customerTypes.${option}`, option)}
                </option>
              ))}
            </select>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.phone", "Phone")}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.email", "Email")}
            />
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.source", "Source")}
            />

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.city", "City")}
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.country", "Country")}
            />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.address", "Address")}
            />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div>
              <b>{t("customerDetail.fields.phone")}:</b>{" "}
              {canSeeContactDetails ? customer.phone || "-" : hiddenText()}
            </div>
            <div>
              <b>{t("customerDetail.fields.email")}:</b>{" "}
              {canSeeContactDetails ? customer.email || "-" : hiddenText()}
            </div>
            <div>
              <b>{t("customerDetail.fields.agency")}:</b> {customer.agency?.name || "-"}
            </div>
            <div>
              <b>{t("customerDetail.fields.city")}:</b>{" "}
              {canSeeContactDetails ? customer.city || "-" : hiddenText()}
            </div>
            <div>
              <b>{t("customerDetail.fields.country")}:</b>{" "}
              {canSeeContactDetails ? customer.country || "-" : hiddenText()}
            </div>
            <div>
              <b>{t("customerDetail.fields.source")}:</b> {customer.source || "-"}
            </div>
            <div>
              <b>
                {safeTranslate(
                  t,
                  "customerDetail.fields.ownerSales",
                  locale === "tr" ? "Sorumlu Sales" : "Owner Sales",
                )}
                :
              </b>{" "}
              {customer.owner?.name || "-"}
            </div>
          </div>
        )}

        {canEditCustomer ? (
          <textarea
            value={customerNotesSummary}
            onChange={(e) => setCustomerNotesSummary(e.target.value)}
            placeholder={safeTranslate(
              t,
              "customers.fields.notesSummary",
              locale === "tr" ? "Özet not" : "Summary note",
            )}
          />
        ) : customer.notesSummary ? (
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
          <div style={{ fontWeight: 900 }}>{t("customerDetail.newPresentation")}</div>

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
              placeholder={t("customerDetail.presentationFields.title")}
            />
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t("customerDetail.presentationFields.projectName")}
            />
            <input
              type="datetime-local"
              value={presentationAt}
              onChange={(e) => setPresentationAt(e.target.value)}
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("customerDetail.presentationFields.location")}
            />

            {isSales ? (
              <input value={me?.name || ""} disabled />
            ) : (
              <select
                value={assignedSalesId}
                onChange={(e) => setAssignedSalesId(e.target.value)}
              >
                <option value="">{t("customerDetail.presentationFields.selectSales")}</option>
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
            placeholder={t("customerDetail.presentationFields.notesSummary")}
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
              {saving ? t("customerDetail.saving") : t("customerDetail.createPresentation")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{t("customerDetail.presentationHistory")}</div>

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
            {t("customerDetail.noPresentations")}
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
                      {p.projectName || "-"} • {formatDateTime(p.presentationAt)}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t("customerDetail.salesLabel")}: {p.assignedSales?.name || "-"} •{" "}
                      {t("customerDetail.createdByLabel")}: {p.createdBy?.name || "-"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${badgeClass(p.status)}`}>
                      {safeTranslate(t, `presentationStatuses.${p.status}`, p.status)}
                    </span>
                    {p.outcome ? (
                      <span className={`badge ${badgeClass(p.outcome)}`}>
                        {safeTranslate(t, `presentationOutcomes.${p.outcome}`, p.outcome)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ fontSize: 13 }}>
                  <b>{t("customerDetail.presentationFields.location")}:</b> {p.location || "-"}
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

                {canEditCustomer ? (
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
                          {safeTranslate(t, `presentationStatuses.${s}`, s)}
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
                      <option value="">{t("customerDetail.selectOutcome")}</option>
                      {OUTCOME_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {safeTranslate(t, `presentationOutcomes.${o}`, o)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>{t("customerDetail.presentationNotes")}</div>

                  {p.notes.length === 0 ? (
                    <div className="muted">{t("customerDetail.noNotes")}</div>
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
                          {n.createdBy?.name || "-"} • {formatDateTime(n.createdAt)}
                        </div>
                        <div>{n.note}</div>
                      </div>
                    ))
                  )}

                  {canEditCustomer ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <textarea
                        value={noteByPresentationId[p.id] || ""}
                        onChange={(e) =>
                          setNoteByPresentationId((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        placeholder={t("customerDetail.addPresentationNotePlaceholder")}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          className="primary"
                          onClick={() => addPresentationNote(p.id)}
                          disabled={saving || !(noteByPresentationId[p.id] || "").trim()}
                        >
                          {t("customerDetail.addNote")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}