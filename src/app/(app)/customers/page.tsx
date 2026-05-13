"use client";

import { useEffect, useMemo, useState } from "react";
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

type CustomerType = "POTENTIAL" | "EXISTING";
type Gender = "MALE" | "FEMALE" | "OTHER";
type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type AgencyRow = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  role?: string;
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
  owner?: {
    id: string;
    name: string;
    email?: string | null;
    role?: string;
  } | null;
  canSeeContactDetails?: boolean;
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

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function projectLabel(project: string, locale: string) {
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
      return locale === "tr" ? "Proje" : "Project";
  }
}

function optionMatch(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export default function CustomersPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<CustomerRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [ownerUsers, setOwnerUsers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | CustomerType>("ALL");
  const [ownerFilterId, setOwnerFilterId] = useState("");

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
  const [ownerId, setOwnerId] = useState("");

  const [agencySearch, setAgencySearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  const [language, setLanguage] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [birthday, setBirthday] = useState("");
  const [job, setJob] = useState("");
  const [project, setProject] = useState<"" | ProjectType>("");

  const [unitProject, setUnitProject] = useState<"" | ProjectType>("");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitSelections, setUnitSelections] = useState<
    Array<{ project: ProjectType; unitNumber: string }>
  >([]);

  const [idFile, setIdFile] = useState<File | null>(null);

  const role = me?.role as string | undefined;
  const isSales = role === "SALES";
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";
  const canCreate = role === "MANAGER" || role === "ADMIN" || role === "SALES";
  const canDelete = role === "MANAGER" || role === "ADMIN";

  function handleCountryChange(nextCountry: string) {
    setCountry(nextCountry);
    setNationality(NATIONALITY_BY_COUNTRY[nextCountry] || "");
  }

  function hiddenText() {
    return safeTranslate(
      t,
      "common.hidden",
      locale === "tr" ? "Gizli" : "Hidden",
    );
  }

  function canSeeContact(customer: CustomerRow) {
    if (!isSales) return true;
    return customer.canSeeContactDetails === true;
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
      const res = await authedFetch("/agencies?page=1&pageSize=500");
      setAgencies(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setAgencies([]);
    }
  }

  async function loadOwnerUsers() {
    if (!isManagerOrAdmin) {
      setOwnerUsers([]);
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

      setOwnerUsers(unique);
    } catch {
      setOwnerUsers([]);
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
        ownerId: isSales ? undefined : ownerId || null,

        language: language.trim() || undefined,
        nationality: nationality.trim() || undefined,
        gender: gender || undefined,
        birthday: birthday ? new Date(birthday).toISOString() : undefined,
        job: job.trim() || undefined,
        project: project || undefined,
        unitSelections,
      };

      const created = await authedFetch("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (idFile && created?.id) {
        const formData = new FormData();
        formData.append("file", idFile);
        formData.append("type", "ID");

        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ||
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          "";

        const uploadToken = getAccessToken();
        const refreshToken = getRefreshToken();

        let uploadRes = await fetch(
          `${apiBase}/customers/${created.id}/documents/upload`,
          {
            method: "POST",
            headers: uploadToken
              ? { Authorization: `Bearer ${uploadToken}` }
              : undefined,
            body: formData,
          },
        );

        if (uploadRes.status === 401 && refreshToken) {
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

          uploadRes = await fetch(
            `${apiBase}/customers/${created.id}/documents/upload`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${data.accessToken}` },
              body: formData,
            },
          );
        }

        if (!uploadRes.ok) {
          const text = await uploadRes.text();
          throw new Error(text || "Document upload failed");
        }
      }

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
      setOwnerId(isSales ? me?.id || "" : "");
      setAgencySearch("");
      setOwnerSearch("");
      setLanguage("");
      setNationality("");
      setGender("");
      setBirthday("");
      setJob("");
      setProject("");
      setUnitProject("");
      setUnitNumber("");
      setUnitSelections([]);
      setIdFile(null);
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
      t("customers.deleteConfirm").replace("{name}", name),
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

  function clearFilters() {
    setQ("");
    setTypeFilter("ALL");
    setOwnerFilterId("");
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    load();
    loadAgencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    if (isSales) {
      setOwnerId(me?.id || "");
      setOwnerUsers([]);
    } else {
      loadOwnerUsers();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isSales, isManagerOrAdmin, me?.id]);

  const filteredAgencies = useMemo(() => {
    if (!agencySearch.trim()) return agencies.slice(0, 80);

    return agencies
      .filter((a) => optionMatch(a.name, agencySearch))
      .slice(0, 80);
  }, [agencies, agencySearch]);

  const filteredOwnerUsers = useMemo(() => {
    if (!ownerSearch.trim()) return ownerUsers.slice(0, 80);

    return ownerUsers
      .filter((u) =>
        optionMatch(`${u.name} ${u.email || ""} ${u.role || ""}`, ownerSearch),
      )
      .slice(0, 80);
  }, [ownerUsers, ownerSearch]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((c) => {
      if (typeFilter !== "ALL" && c.type !== typeFilter) return false;

      if (ownerFilterId && c.owner?.id !== ownerFilterId) return false;

      if (!qq) return true;

      const searchableText = canSeeContact(c)
        ? `${c.fullName || ""} ${c.companyName || ""} ${c.phone || ""} ${
            c.email || ""
          } ${c.city || ""} ${c.country || ""} ${c.agency?.name || ""} ${
            c.owner?.name || ""
          }`
        : `${c.fullName || ""} ${c.companyName || ""} ${
            c.agency?.name || ""
          } ${c.owner?.name || ""}`;

      return searchableText.toLowerCase().includes(qq);
    });
  }, [items, q, typeFilter, ownerFilterId, isSales]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("customers.label")}
          </div>

          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {t("customers.title")}
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            {t("customers.subtitle")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading}>
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canCreate ? (
            <button
              className="primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? t("common.close") : t("customers.newCustomer")}
            </button>
          ) : null}
        </div>
      </div>

      {isSales ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(245,158,11,.35)",
            background: "rgba(245,158,11,.08)",
          }}
        >
          {safeTranslate(
            t,
            "customers.limitedAccessNotice",
            locale === "tr"
              ? "Size ait olmayan müşteriler için iletişim bilgileri gizlenmiştir. Detay sayfasında yalnızca kendi müşterilerinizi düzenleyebilirsiniz."
              : "Contact details are hidden for customers that do not belong to you. On the detail page, you can only edit your own customers.",
          )}
        </div>
      ) : null}

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>{t("customers.createTitle")}</div>

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
              placeholder={t("customers.fields.fullName")}
            />

            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("customers.fields.companyName")}
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("customers.fields.phone")}
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("customers.fields.email")}
            />

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("customers.fields.city")}
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
              placeholder={t("customers.fields.address")}
            />

            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("customers.fields.source")}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
            >
              <option value="POTENTIAL">
                {safeTranslate(t, "customerTypes.POTENTIAL", "POTENTIAL")}
              </option>

              <option value="EXISTING">
                {safeTranslate(t, "customerTypes.EXISTING", "EXISTING")}
              </option>
            </select>

            <div style={{ display: "grid", gap: 6 }}>
              <input
                value={agencySearch}
                onChange={(e) => setAgencySearch(e.target.value)}
                placeholder={
                  locale === "tr" ? "Ajans ara..." : "Search agency..."
                }
              />

              <select
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
              >
                <option value="">{t("customers.fields.selectAgency")}</option>

                {filteredAgencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {isSales ? (
              <input
                value={me?.name || ""}
                disabled
                placeholder={safeTranslate(
                  t,
                  "customers.fields.ownerSales",
                  locale === "tr" ? "Sorumlu Kullanıcı" : "Responsible User",
                )}
              />
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <input
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder={
                    locale === "tr"
                      ? "Sales / Manager ara..."
                      : "Search sales / manager..."
                  }
                />

                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  <option value="">
                    {locale === "tr"
                      ? "Sorumlu kullanıcı seç"
                      : "Select responsible user"}
                  </option>

                  {filteredOwnerUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.email ? `(${u.email})` : ""}{" "}
                      {u.role ? `- ${u.role}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.language",
                locale === "tr" ? "Dil" : "Language",
              )}
            />

            <input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder={safeTranslate(
                t,
                "customers.fields.nationality",
                locale === "tr" ? "Uyruk" : "Nationality",
              )}
            />

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "" | Gender)}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "customers.fields.gender",
                  locale === "tr" ? "Cinsiyet" : "Gender",
                )}
              </option>

              <option value="MALE">
                {safeTranslate(
                  t,
                  "genders.MALE",
                  locale === "tr" ? "Erkek" : "Male",
                )}
              </option>

              <option value="FEMALE">
                {safeTranslate(
                  t,
                  "genders.FEMALE",
                  locale === "tr" ? "Kadın" : "Female",
                )}
              </option>

              <option value="OTHER">
                {safeTranslate(
                  t,
                  "genders.OTHER",
                  locale === "tr" ? "Diğer" : "Other",
                )}
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
              placeholder={safeTranslate(
                t,
                "customers.fields.job",
                locale === "tr" ? "Meslek" : "Job",
              )}
            />

            <select
              value={project}
              onChange={(e) => setProject(e.target.value as "" | ProjectType)}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "customers.fields.project",
                  locale === "tr" ? "Proje" : "Project",
                )}
              </option>

              <option value="LA_JOYA">{projectLabel("LA_JOYA", locale)}</option>
              <option value="LA_JOYA_PERLA">
                {projectLabel("LA_JOYA_PERLA", locale)}
              </option>
              <option value="LA_JOYA_PERLA_II">
                {projectLabel("LA_JOYA_PERLA_II", locale)}
              </option>
              <option value="LAGOON_VERDE">
                {projectLabel("LAGOON_VERDE", locale)}
              </option>
            </select>
          </div>

          <textarea
            value={notesSummary}
            onChange={(e) => setNotesSummary(e.target.value)}
            placeholder={t("customers.fields.notesSummary")}
          />

          <div
            style={{
              border: "1px solid var(--stroke)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface-2)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              {safeTranslate(
                t,
                "customers.fields.unitSelections",
                locale === "tr" ? "Ünite Seçimleri" : "Unit Selections",
              )}
            </div>

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
                    locale === "tr" ? "Proje seç" : "Select project",
                  )}
                </option>

                <option value="LA_JOYA">
                  {projectLabel("LA_JOYA", locale)}
                </option>
                <option value="LA_JOYA_PERLA">
                  {projectLabel("LA_JOYA_PERLA", locale)}
                </option>
                <option value="LA_JOYA_PERLA_II">
                  {projectLabel("LA_JOYA_PERLA_II", locale)}
                </option>
                <option value="LAGOON_VERDE">
                  {projectLabel("LAGOON_VERDE", locale)}
                </option>
              </select>

              <input
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder={safeTranslate(
                  t,
                  "customers.fields.unitNumber",
                  locale === "tr"
                    ? "Ünite No (A2, B5...)"
                    : "Unit No (A2, B5...)",
                )}
              />

              <button type="button" onClick={addUnitSelection}>
                {safeTranslate(
                  t,
                  "common.add",
                  locale === "tr" ? "Ekle" : "Add",
                )}
              </button>
            </div>

            {unitSelections.length > 0 ? (
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
                      background: "var(--surface)",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>
                      {projectLabel(u.project, locale)} / {u.unitNumber}
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
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>
                {safeTranslate(
                  t,
                  "customers.fields.noUnitSelections",
                  locale === "tr"
                    ? "Henüz ünite eklenmedi."
                    : "No units added yet.",
                )}
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid var(--stroke)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface-2)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              {safeTranslate(
                t,
                "customers.fields.idDocument",
                locale === "tr" ? "Kimlik Belgesi" : "ID Document",
              )}
            </div>

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
            />

            {idFile ? (
              <div className="muted" style={{ fontSize: 13 }}>
                {idFile.name}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowCreate(false)}>
              {t("common.cancel")}
            </button>

            <button
              className="primary"
              onClick={createCustomer}
              disabled={saving || !fullName.trim() || (!isSales && !ownerId)}
            >
              {saving ? t("customers.saving") : t("customers.createCustomer")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSales
              ? "1fr 220px auto auto"
              : "1fr 220px 260px auto auto",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("customers.searchPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? t("customers.allTypes")
                  : safeTranslate(t, `customerTypes.${option}`, option)}
              </option>
            ))}
          </select>

          {!isSales ? (
            <select
              value={ownerFilterId}
              onChange={(e) => setOwnerFilterId(e.target.value)}
            >
              <option value="">
                {locale === "tr"
                  ? "Tüm Sales / Manager"
                  : "All Sales / Managers"}
              </option>

              {ownerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role ? `- ${u.role}` : ""}
                </option>
              ))}
            </select>
          ) : null}

          <button onClick={load} disabled={loading}>
            {t("customers.searchAndRefresh")}
          </button>

          <button onClick={clearFilters} disabled={loading}>
            {locale === "tr" ? "Temizle" : "Clear"}
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
              <th>{t("customers.table.customer")}</th>
              <th>{t("customers.table.contact")}</th>
              <th>{t("customers.table.agency")}</th>
              <th>
                {safeTranslate(
                  t,
                  "customers.table.ownerSales",
                  locale === "tr" ? "Sorumlu Kullanıcı" : "Responsible User",
                )}
              </th>
              <th>{t("customers.table.type")}</th>
              <th>{t("customers.table.presentations")}</th>
              <th>{t("customers.table.updatedAt")}</th>
              {canDelete ? <th>{t("customers.table.actions")}</th> : null}
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => {
              const visible = canSeeContact(c);

              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <a href={`/customers/${c.id}`} style={{ fontWeight: 900 }}>
                        {c.fullName}
                      </a>

                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: 12,
                        }}
                      >
                        {c.companyName || "-"}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div>{visible ? c.phone || "-" : hiddenText()}</div>

                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: 12,
                        }}
                      >
                        {visible ? c.email || "-" : hiddenText()}
                      </div>

                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {visible
                          ? [c.city, c.country].filter(Boolean).join(", ") ||
                            "-"
                          : hiddenText()}
                      </div>
                    </div>
                  </td>

                  <td>{c.agency?.name || "-"}</td>

                  <td>
                    {c.owner?.name || "-"}
                    {c.owner?.role ? (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.owner.role}
                      </div>
                    ) : null}
                  </td>

                  <td>
                    <span className={`badge ${badgeClass(c.type)}`}>
                      {c.type
                        ? safeTranslate(t, `customerTypes.${c.type}`, c.type)
                        : "-"}
                    </span>
                  </td>

                  <td>{c._count?.presentations ?? 0}</td>

                  <td>
                    {c.updatedAt
                      ? new Date(c.updatedAt).toLocaleString(
                          locale === "tr" ? "tr-TR" : "en-US",
                        )
                      : "-"}
                  </td>

                  {canDelete ? (
                    <td>
                      <button
                        className="danger"
                        onClick={() => deleteCustomer(c.id, c.fullName)}
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id
                          ? t("customers.deleting")
                          : t("common.delete")}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("customers.noCustomers")}
          </div>
        ) : null}
      </div>
    </div>
  );
}