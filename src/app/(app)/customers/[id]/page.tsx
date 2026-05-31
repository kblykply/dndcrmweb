"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import {
  getUser,
  getAccessToken,
  getRefreshToken,
  clearSession,
  setAccessToken,
} from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { COUNTRIES, NATIONALITY_BY_COUNTRY } from "@/lib/locationData";

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

type AssignableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Gender = "MALE" | "FEMALE" | "OTHER";
type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type CustomerDocumentType = "ID" | "PASSPORT" | "OTHER";

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
    role?: string | null;
  } | null;
  canSeeContactDetails?: boolean;
  canEdit?: boolean;
  agency?: {
    id: string;
    name: string;
  } | null;

  language?: string | null;
  nationality?: string | null;
  identityNumber?: string | null;
  oldCustomerCode?: string | null;
  oldCariCodes?: string | null;
  gender?: Gender | null;
  birthday?: string | null;
  job?: string | null;
  project?: ProjectType | null;
  idDocumentUrl?: string | null;
  idDocumentName?: string | null;

  unitSelections?: Array<{
    id: string;
    project: ProjectType;
    unitNumber: string;
    createdAt?: string;
  }>;

  documents?: Array<{
    id: string;
    type: CustomerDocumentType;
    fileName: string;
    storagePath: string;
    mimeType?: string | null;
    createdAt?: string;
  }>;

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
      role?: string;
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
  return translated === path ? fallback ?? path : translated;
}

function optionMatch(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function projectLabel(project?: string | null) {
  switch (project) {
    case "LA_JOYA":
      return "La Joya";
    case "LA_JOYA_PERLA":
      return "La Joya Perla";
    case "LA_JOYA_PERLA_II":
      return "La Joya Perla II";
    case "LAGOON_VERDE":
      return "Lagoon Verde";
    default:
      return "-";
  }
}

export default function CustomerDetailPage() {
  const { t, locale } = useLanguage();

  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const customerId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [presentationAt, setPresentationAt] = useState("");
  const [location, setLocation] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [assignedSalesId, setAssignedSalesId] = useState("");
  const [assignableSearch, setAssignableSearch] = useState("");

  const [noteByPresentationId, setNoteByPresentationId] = useState<
    Record<string, string>
  >({});

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

  const [language, setLanguage] = useState("");
  const [nationality, setNationality] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [oldCustomerCode, setOldCustomerCode] = useState("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [birthday, setBirthday] = useState("");
  const [job, setJob] = useState("");
  const [project, setProject] = useState<"" | ProjectType>("");

  const [unitProject, setUnitProject] = useState<"" | ProjectType>("");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitSelections, setUnitSelections] = useState<
    Array<{ project: ProjectType; unitNumber: string }>
  >([]);

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

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

  const filteredAssignableUsers = useMemo(() => {
    if (!assignableSearch.trim()) return assignableUsers.slice(0, 80);

    return assignableUsers
      .filter((u) =>
        optionMatch(
          `${u.name} ${u.email || ""} ${u.role || ""}`,
          assignableSearch,
        ),
      )
      .slice(0, 80);
  }, [assignableUsers, assignableSearch]);

  function hiddenText() {
    return safeTranslate(
      t,
      "common.hidden",
      locale === "tr" ? "Gizli" : "Hidden",
    );
  }

  function handleCountryChange(nextCountry: string) {
    setCountry(nextCountry);
    setNationality(NATIONALITY_BY_COUNTRY[nextCountry] || "");
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

    setLanguage(data.language || "");
    setNationality(data.nationality || "");
    setIdentityNumber(data.identityNumber || "");
    setOldCustomerCode(data.oldCustomerCode || data.oldCariCodes || "");
    setGender((data.gender as "" | Gender) || "");
    setBirthday(data.birthday ? String(data.birthday).slice(0, 10) : "");
    setJob(data.job || "");
    setProject((data.project as "" | ProjectType) || "");

    setUnitSelections(
      Array.isArray(data.unitSelections)
        ? data.unitSelections.map((u) => ({
            project: u.project,
            unitNumber: u.unitNumber,
          }))
        : [],
    );
  }

  async function openCustomerDocument(documentId: string) {
    if (!customer) return;

    setErr(null);

    try {
      const res = await authedFetch(
        `/customers/${customer.id}/documents/${documentId}/url`,
      );

      if (!res?.url) {
        throw new Error("Document URL not found");
      }

      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
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

      if (!isSales && customerData?.ownerId) {
        setAssignedSalesId(customerData.ownerId);
      }
    } catch (e: any) {
      setCustomer(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignableUsers() {
    if (!isManagerOrAdmin) {
      setAssignableUsers([]);
      return;
    }

    try {
      const [salesRes, managerRes] = await Promise.all([
        authedFetch("/users?role=SALES"),
        authedFetch("/users?role=MANAGER"),
      ]);

      const sales = Array.isArray(salesRes) ? salesRes : [];
      const managers = Array.isArray(managerRes) ? managerRes : [];

      const merged = [...managers, ...sales];
      const unique = Array.from(
        new Map(merged.map((u) => [u.id, u])).values(),
      );

      setAssignableUsers(unique);
    } catch {
      setAssignableUsers([]);
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
          language: language.trim() || null,
          nationality: nationality.trim() || null,
          identityNumber: identityNumber.trim() || null,
          oldCustomerCode: oldCustomerCode.trim() || null,
          oldCariCodes: oldCustomerCode.trim() || null,
          gender: gender || null,
          birthday: birthday ? new Date(birthday).toISOString() : null,
          job: job.trim() || null,
          project: project || null,
          unitSelections,
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
      setAssignedSalesId(isSales ? me?.id || "" : customer?.ownerId || "");
      setAssignableSearch("");

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

  function addUnitSelection() {
    if (!unitProject || !unitNumber.trim()) return;

    const normalizedUnit = unitNumber.trim();

    const exists = unitSelections.some(
      (u) =>
        u.project === unitProject &&
        u.unitNumber.toLowerCase() === normalizedUnit.toLowerCase(),
    );

    if (exists) return;

    setUnitSelections((prev) => [
      ...prev,
      {
        project: unitProject,
        unitNumber: normalizedUnit,
      },
    ]);

    setUnitProject("");
    setUnitNumber("");
  }

  function removeUnitSelection(index: number) {
    setUnitSelections((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadCustomerDocument(
    file: File,
    type: CustomerDocumentType = "ID",
  ) {
    if (!customer) return;

    setErr(null);
    setUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "";

      if (!apiBase) {
        throw new Error("API base URL is missing");
      }

      const uploadToken = getAccessToken();
      const refreshToken = getRefreshToken();

      let res = await fetch(
        `${apiBase}/customers/${customer.id}/documents/upload`,
        {
          method: "POST",
          headers: uploadToken
            ? { Authorization: `Bearer ${uploadToken}` }
            : undefined,
          body: formData,
        },
      );

      if (res.status === 401 && refreshToken) {
        const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          clearSession();

          if (typeof window !== "undefined") {
            window.location.href = "/";
          }

          throw new Error("Session expired");
        }

        const data = await refreshRes.json();
        setAccessToken(data.accessToken);

        res = await fetch(
          `${apiBase}/customers/${customer.id}/documents/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.accessToken}`,
            },
            body: formData,
          },
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      await loadCustomer();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setUploadingDoc(false);
    }
  }

  async function deleteCustomerDocument(documentId: string) {
    if (!customer) return;

    setErr(null);
    setDeletingDocId(documentId);

    try {
      await authedFetch(`/customers/${customer.id}/documents/${documentId}`, {
        method: "DELETE",
      });

      await loadCustomer();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setDeletingDocId(null);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, customerId, isSales]);

  useEffect(() => {
    if (!mounted || !me) return;

    if (role === "SALES") {
      setAssignedSalesId(me?.id || "");
      setAssignableUsers([]);
    } else {
      loadAssignableUsers();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) {
    return <div className="card">{t("customerDetail.loadingCustomer")}</div>;
  }

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

          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {customer.fullName}
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            {customer.companyName || "-"} •{" "}
            {customer.agency?.name || t("customerDetail.noAgency")}
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "customerDetail.fields.ownerSales",
              locale === "tr" ? "Sorumlu Kullanıcı" : "Responsible User",
            )}
            : {customer.owner?.name || "-"}
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
          <div className="muted">
            {t("customerDetail.stats.totalPresentations")}
          </div>
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
          <div style={{ fontWeight: 900 }}>
            {t("customerDetail.customerInfo")}
          </div>

          {canEditCustomer ? (
            <button
              className="primary"
              onClick={saveCustomer}
              disabled={saving || !fullName.trim()}
            >
              {saving
                ? t("customerDetail.saving")
                : safeTranslate(
                    t,
                    "customerDetail.saveCustomer",
                    locale === "tr" ? "Müşteriyi Kaydet" : "Save Customer",
                  )}
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
              placeholder={safeTranslate(
                t,
                "customers.fields.fullName",
                "Full Name",
              )}
            />

            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.companyName",
                "Company",
              )}
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
              placeholder={safeTranslate(
                t,
                "customers.fields.source",
                "Source",
              )}
            />

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.city", "City")}
            />

            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "customers.fields.selectCountry",
                  locale === "tr" ? "Ülke seç" : "Select country",
                )}
              </option>
              {COUNTRIES.map((countryName) => (
                <option key={countryName} value={countryName}>
                  {countryName}
                </option>
              ))}
            </select>

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.address",
                "Address",
              )}
            />

            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.language",
                "Language",
              )}
            />

            <input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.nationality",
                "Nationality",
              )}
            />

            <input
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.identityNumber",
                locale === "tr" ? "Kimlik / Pasaport No" : "Identity / Passport No",
              )}
            />

            <input
              value={oldCustomerCode}
              onChange={(e) => setOldCustomerCode(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.oldCustomerCode",
                locale === "tr" ? "Eski Cari Kod" : "Old customer code",
              )}
            />

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "" | Gender)}
            >
              <option value="">
                {safeTranslate(t, "customers.fields.gender", "Gender")}
              </option>
              <option value="MALE">
                {safeTranslate(t, "genders.MALE", "Male")}
              </option>
              <option value="FEMALE">
                {safeTranslate(t, "genders.FEMALE", "Female")}
              </option>
              <option value="OTHER">
                {safeTranslate(t, "genders.OTHER", "Other")}
              </option>
            </select>

            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />

            <input
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder={safeTranslate(t, "customers.fields.job", "Job")}
            />

            <select
              value={project}
              onChange={(e) => setProject(e.target.value as "" | ProjectType)}
            >
              <option value="">
                {safeTranslate(t, "customers.fields.project", "Project")}
              </option>
              <option value="LA_JOYA">La Joya</option>
              <option value="LA_JOYA_PERLA">La Joya Perla</option>
              <option value="LA_JOYA_PERLA_II">La Joya Perla II</option>
              <option value="LAGOON_VERDE">Lagoon Verde</option>
            </select>
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
              <b>{t("customerDetail.fields.agency")}:</b>{" "}
              {customer.agency?.name || "-"}
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
              <b>{t("customerDetail.fields.source")}:</b>{" "}
              {customer.source || "-"}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "customerDetail.fields.ownerSales",
                  locale === "tr" ? "Sorumlu Kullanıcı" : "Responsible User",
                )}
                :
              </b>{" "}
              {customer.owner?.name || "-"}
            </div>

            <div>
              <b>{safeTranslate(t, "customers.fields.language", "Language")}:</b>{" "}
              {customer.language || "-"}
            </div>

            <div>
              <b>
                {safeTranslate(t, "customers.fields.nationality", "Nationality")}:
              </b>{" "}
              {customer.nationality || "-"}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "customers.fields.identityNumber",
                  locale === "tr" ? "Kimlik / Pasaport No" : "Identity / Passport No",
                )}
                :
              </b>{" "}
              {canSeeContactDetails ? customer.identityNumber || "-" : hiddenText()}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "customers.fields.oldCustomerCode",
                  locale === "tr" ? "Eski Cari Kod" : "Old customer code",
                )}
                :
              </b>{" "}
              {canSeeContactDetails
                ? customer.oldCariCodes || customer.oldCustomerCode || "-"
                : hiddenText()}
            </div>

            <div>
              <b>{safeTranslate(t, "customers.fields.gender", "Gender")}:</b>{" "}
              {customer.gender
                ? safeTranslate(t, `genders.${customer.gender}`, customer.gender)
                : "-"}
            </div>

            <div>
              <b>{safeTranslate(t, "customers.fields.job", "Job")}:</b>{" "}
              {customer.job || "-"}
            </div>

            <div>
              <b>{safeTranslate(t, "customers.fields.project", "Project")}:</b>{" "}
              {projectLabel(customer.project)}
            </div>

            <div>
              <b>{safeTranslate(t, "customers.fields.birthday", "Birthday")}:</b>{" "}
              {customer.birthday
                ? new Date(customer.birthday).toLocaleDateString(
                    locale === "tr" ? "tr-TR" : "en-US",
                  )
                : "-"}
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
          <div style={{ fontWeight: 900 }}>
            {t("customerDetail.newPresentation")}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 180px 180px 220px",
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
              <div style={{ display: "grid", gap: 6 }}>
                <input
                  value={assignableSearch}
                  onChange={(e) => setAssignableSearch(e.target.value)}
                  placeholder={
                    locale === "tr"
                      ? "Sales / Manager ara..."
                      : "Search sales / manager..."
                  }
                />

                <select
                  value={assignedSalesId}
                  onChange={(e) => setAssignedSalesId(e.target.value)}
                >
                  <option value="">
                    {locale === "tr"
                      ? "Sorumlu kullanıcı seç"
                      : "Select responsible user"}
                  </option>

                  {filteredAssignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
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
              {saving
                ? t("customerDetail.saving")
                : t("customerDetail.createPresentation")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>
          {t("customerDetail.presentationHistory")}
        </div>

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
                      {t("customerDetail.salesLabel")}:{" "}
                      {p.assignedSales?.name || "-"}{" "}
                      {p.assignedSales?.role ? `(${p.assignedSales.role})` : ""} •{" "}
                      {t("customerDetail.createdByLabel")}:{" "}
                      {p.createdBy?.name || "-"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${badgeClass(p.status)}`}>
                      {safeTranslate(
                        t,
                        `presentationStatuses.${p.status}`,
                        p.status,
                      )}
                    </span>

                    {p.outcome ? (
                      <span className={`badge ${badgeClass(p.outcome)}`}>
                        {safeTranslate(
                          t,
                          `presentationOutcomes.${p.outcome}`,
                          p.outcome,
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ fontSize: 13 }}>
                  <b>{t("customerDetail.presentationFields.location")}:</b>{" "}
                  {p.location || "-"}
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
                  <div style={{ fontWeight: 800 }}>
                    {t("customerDetail.presentationNotes")}
                  </div>

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
                          {n.createdBy?.name || "-"} •{" "}
                          {formatDateTime(n.createdAt)}
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
                        placeholder={t(
                          "customerDetail.addPresentationNotePlaceholder",
                        )}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          className="primary"
                          onClick={() => addPresentationNote(p.id)}
                          disabled={
                            saving || !(noteByPresentationId[p.id] || "").trim()
                          }
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

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "customers.fields.unitSelections",
              "Unit Selections",
            )}
          </div>
        </div>

        {canEditCustomer ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "220px 1fr auto",
                gap: 10,
              }}
            >
              <select
                value={unitProject}
                onChange={(e) =>
                  setUnitProject(e.target.value as "" | ProjectType)
                }
              >
                <option value="">
                  {safeTranslate(
                    t,
                    "customers.fields.selectProject",
                    "Select project",
                  )}
                </option>
                <option value="LA_JOYA">La Joya</option>
                <option value="LA_JOYA_PERLA">La Joya Perla</option>
                <option value="LA_JOYA_PERLA_II">La Joya Perla II</option>
                <option value="LAGOON_VERDE">Lagoon Verde</option>
              </select>

              <input
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder={safeTranslate(
                  t,
                  "customers.fields.unitNumber",
                  "Unit No",
                )}
              />

              <button type="button" onClick={addUnitSelection}>
                {safeTranslate(t, "common.add", "Add")}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {unitSelections.map((u, i) => (
                <div
                  key={`${u.project}-${u.unitNumber}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--stroke)",
                    background: "var(--surface-2)",
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    {projectLabel(u.project)} / {u.unitNumber}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeUnitSelection(i)}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(customer.unitSelections || []).length > 0 ? (
              (customer.unitSelections || []).map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--stroke)",
                    background: "var(--surface-2)",
                    fontSize: 13,
                  }}
                >
                  {projectLabel(u.project)} / {u.unitNumber}
                </div>
              ))
            ) : (
              <div className="muted">
                {safeTranslate(
                  t,
                  "customers.fields.noUnitSelections",
                  "No units added yet.",
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(t, "customers.fields.documents", "Documents")}
          </div>
        </div>

        {canEditCustomer ? (
          <div style={{ display: "grid", gap: 10 }}>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadCustomerDocument(file, "ID");
              }}
              disabled={uploadingDoc}
            />

            {uploadingDoc ? (
              <div className="muted">
                {safeTranslate(
                  t,
                  "customerDetail.uploadingDocument",
                  "Uploading document...",
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {(customer.documents || []).length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {(customer.documents || []).map((doc) => (
              <div
                key={doc.id}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--surface-2)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>{doc.fileName}</div>

                  <div className="muted" style={{ fontSize: 12 }}>
                    {doc.type} • {formatDateTime(doc.createdAt)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => openCustomerDocument(doc.id)}
                  >
                    {safeTranslate(t, "common.open", "Open")}
                  </button>

                  {canEditCustomer ? (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteCustomerDocument(doc.id)}
                      disabled={deletingDocId === doc.id}
                    >
                      {deletingDocId === doc.id
                        ? safeTranslate(t, "common.deleting", "Deleting...")
                        : safeTranslate(t, "common.delete", "Delete")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">
            {safeTranslate(
              t,
              "customers.fields.noDocuments",
              "No documents uploaded yet.",
            )}
          </div>
        )}
      </div>
    </div>
  );
}
