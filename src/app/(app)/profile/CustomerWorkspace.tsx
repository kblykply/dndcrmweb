"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type CustomerType = "POTENTIAL" | "EXISTING";
type AgencyStatus = "ACTIVE" | "PASSIVE" | "PROSPECT" | "DEALING" | "CLOSED";
type WorkspaceTab = "CUSTOMERS" | "PRESENTATIONS" | "AGENCIES";
type WorkspaceScope = "mine" | "all";

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  isActive?: boolean;
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
  updatedAt?: string;
  agency?: { id: string; name: string } | null;
  owner?: UserRow | null;
  unitSelections?: Array<{ project: string; unitNumber: string }>;
  _count?: {
    presentations?: number;
    documents?: number;
    unitSelections?: number;
  };
};

type PresentationRow = {
  id: string;
  title: string;
  projectName?: string | null;
  presentationAt: string;
  location?: string | null;
  status?: string;
  outcome?: string | null;
  customer?: {
    id: string;
    fullName: string;
    companyName?: string | null;
    owner?: UserRow | null;
  } | null;
  assignedSales?: UserRow | null;
  createdBy?: UserRow | null;
};

type AgencyRow = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  status?: AgencyStatus;
  updatedAt?: string;
  assignedSales?: UserRow | null;
  _count?: {
    notes?: number;
    meetings?: number;
    tasks?: number;
  };
};

type WorkspaceData = {
  stats?: {
    scope?: "MINE" | "ALL";
    customers?: number;
    potentialCustomers?: number;
    existingCustomers?: number;
    presentations?: number;
    upcomingPresentations?: number;
    completedPresentations?: number;
  };
  customers?: CustomerRow[];
  presentations?: PresentationRow[];
};

type TypeFilter = "ALL" | CustomerType;

function formatDateTime(value?: string | null, locale = "en") {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

function customerTypeLabel(type: string | undefined, locale: string) {
  if (type === "EXISTING") return locale === "tr" ? "Mevcut" : "Existing";
  if (type === "POTENTIAL") return locale === "tr" ? "Potansiyel" : "Potential";
  return "-";
}

function statusLabel(status: string | undefined, locale: string) {
  const labels: Record<string, { en: string; tr: string }> = {
    SCHEDULED: { en: "Scheduled", tr: "Planlandı" },
    COMPLETED: { en: "Completed", tr: "Tamamlandı" },
    CANCELLED: { en: "Cancelled", tr: "İptal" },
    RESCHEDULED: { en: "Rescheduled", tr: "Ertelendi" },
  };

  return status ? labels[status]?.[locale === "tr" ? "tr" : "en"] || status : "-";
}

function statusTone(status: string | undefined) {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "RESCHEDULED") return "warning";
  return "info";
}

function agencyStatusLabel(status: string | undefined, locale: string) {
  const labels: Record<string, { en: string; tr: string }> = {
    ACTIVE: { en: "Active", tr: "Aktif" },
    PASSIVE: { en: "Passive", tr: "Pasif" },
    PROSPECT: { en: "Prospect", tr: "Potansiyel" },
    DEALING: { en: "Dealing", tr: "Görüşmede" },
    CLOSED: { en: "Closed", tr: "Kapandı" },
  };

  return status ? labels[status]?.[locale === "tr" ? "tr" : "en"] || status : "-";
}

function agencyStatusTone(status: string | undefined) {
  if (status === "ACTIVE" || status === "DEALING") return "success";
  if (status === "PROSPECT") return "info";
  if (status === "PASSIVE") return "warning";
  if (status === "CLOSED") return "danger";
  return "info";
}

function projectLabel(value?: string | null) {
  const labels: Record<string, string> = {
    LA_JOYA: "La Joya",
    LA_JOYA_PERLA: "La Joya Perla",
    LA_JOYA_PERLA_II: "La Joya Perla II",
    LAGOON_VERDE: "Lagoon Verde",
  };

  return value ? labels[value] || value : "-";
}

function emptyValue(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function WorkspaceStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "neutral" | "green" | "blue" | "amber";
}) {
  return (
    <div className={`workspace-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function CustomerWorkspace() {
  const { locale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<WorkspaceData>({});
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserRow[]>([]);
  const [ownerDrafts, setOwnerDrafts] = useState<Record<string, string>>({});
  const [agencyDrafts, setAgencyDrafts] = useState<Record<string, string>>({});
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [bulkOwnerId, setBulkOwnerId] = useState("");
  const [bulkAgencyOwnerId, setBulkAgencyOwnerId] = useState("");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("CUSTOMERS");
  const [workspaceScope, setWorkspaceScope] = useState<WorkspaceScope>("mine");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [savingAgencyId, setSavingAgencyId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkAgencySaving, setBulkAgencySaving] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const customers = Array.isArray(data.customers) ? data.customers : [];
  const presentations = Array.isArray(data.presentations) ? data.presentations : [];
  const stats = data.stats || {};
  const activeAgencyCount = agencies.filter(
    (agency) => agency.status === "ACTIVE" || agency.status === "DEALING",
  ).length;
  const role = me?.role as string | undefined;
  const canUseWorkspace =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "SALES" ||
    role === "AFTERSALES" ||
    role === "PREVIEW";
  const canUseAllScope = role === "ADMIN" || role === "MANAGER" || role === "AFTERSALES";
  const canUseAgencyWorkspace =
    role === "ADMIN" || role === "MANAGER" || role === "SALES" || role === "PREVIEW";
  const canManageAgencyAssignments = role === "ADMIN" || role === "MANAGER";
  const isAllScope = canUseAllScope && workspaceScope === "all";

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const workspacePath = isAllScope
        ? "/customers/my-workspace?scope=all"
        : "/customers/my-workspace";
      const agencyParams = new URLSearchParams({
        page: "1",
        pageSize: "500",
      });

      if (isAllScope) {
        agencyParams.set("scope", "all");
      } else if (me?.id) {
        agencyParams.set("assignedSalesId", me.id);
      }

      const [workspace, agenciesRes, usersRes] = await Promise.all([
        authedFetch(workspacePath),
        canUseAgencyWorkspace
          ? authedFetch(`/agencies?${agencyParams.toString()}`)
          : Promise.resolve({ items: [] }),
        authedFetch("/users?all=true"),
      ]);

      const nextData = (workspace || {}) as WorkspaceData;
      const nextAgencies = Array.isArray(agenciesRes?.items) ? agenciesRes.items : [];
      const users = Array.isArray(usersRes)
        ? usersRes
            .filter(
              (u) =>
                u?.isActive !== false &&
                (u?.role === "SALES" || u?.role === "MANAGER"),
            )
            .sort((a, b) =>
              `${a.role || ""} ${a.name || ""}`.localeCompare(
                `${b.role || ""} ${b.name || ""}`,
              ),
            )
        : [];

      setData(nextData);
      setAgencies(nextAgencies);
      setAssignableUsers(users);
      setOwnerDrafts(
        Object.fromEntries(
          (nextData.customers || []).map((customer) => [
            customer.id,
            customer.owner?.id || "",
          ]),
        ),
      );
      setAgencyDrafts(
        Object.fromEntries(
          nextAgencies.map((agency: AgencyRow) => [
            agency.id,
            agency.assignedSales?.id || "",
          ]),
        ),
      );
      setSelectedCustomerIds((prev) =>
        prev.filter((id) => (nextData.customers || []).some((customer) => customer.id === id)),
      );
      setSelectedAgencyIds((prev) =>
        prev.filter((id) => nextAgencies.some((agency: AgencyRow) => agency.id === id)),
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData({});
      setAgencies([]);
      setAssignableUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function transferCustomer(customer: CustomerRow) {
    const nextOwnerId = ownerDrafts[customer.id] || "";
    if (!nextOwnerId || nextOwnerId === customer.owner?.id) return;

    const nextOwner = assignableUsers.find((user) => user.id === nextOwnerId);
    const ok = window.confirm(
      locale === "tr"
        ? `${customer.fullName} müşterisi ${nextOwner?.name || "seçilen kullanıcı"} üzerine aktarılsın mı?`
        : `Transfer ${customer.fullName} to ${nextOwner?.name || "selected user"}?`,
    );

    if (!ok) return;

    setSavingId(customer.id);
    setErr("");
    setNotice("");

    try {
      await authedFetch(`/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ownerId: nextOwnerId }),
      });

      await load();
      setNotice(locale === "tr" ? "Müşteri aktarıldı." : "Customer transferred.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId("");
    }
  }

  async function transferSelectedCustomers() {
    if (selectedCustomerIds.length === 0 || !bulkOwnerId) return;

    const nextOwner = assignableUsers.find((user) => user.id === bulkOwnerId);
    const selectedCustomers = customers.filter((customer) =>
      selectedCustomerIds.includes(customer.id),
    );
    const changedCustomers = selectedCustomers.filter(
      (customer) => customer.owner?.id !== bulkOwnerId,
    );

    if (changedCustomers.length === 0) {
      setNotice(
        locale === "tr"
          ? "Seçili müşteriler zaten bu sorumlu kullanıcıda."
          : "Selected customers already belong to this owner.",
      );
      return;
    }

    const ok = window.confirm(
      locale === "tr"
        ? `${changedCustomers.length} müşteri ${nextOwner?.name || "seçilen kullanıcı"} üzerine aktarılsın mı?`
        : `Transfer ${changedCustomers.length} customers to ${nextOwner?.name || "selected user"}?`,
    );

    if (!ok) return;

    setBulkSaving(true);
    setErr("");
    setNotice("");

    try {
      await Promise.all(
        changedCustomers.map((customer) =>
          authedFetch(`/customers/${customer.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ownerId: bulkOwnerId }),
          }),
        ),
      );

      await load();
      setSelectedCustomerIds([]);
      setBulkOwnerId("");
      setNotice(
        locale === "tr"
          ? `${changedCustomers.length} müşteri aktarıldı.`
          : `${changedCustomers.length} customers transferred.`,
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBulkSaving(false);
    }
  }

  async function transferAgency(agency: AgencyRow) {
    if (!canManageAgencyAssignments) return;

    const nextOwnerId = agencyDrafts[agency.id] || "";
    if (!nextOwnerId || nextOwnerId === agency.assignedSales?.id) return;

    const nextOwner = assignableUsers.find((user) => user.id === nextOwnerId);
    const ok = window.confirm(
      locale === "tr"
        ? `${agency.name} ajansı ${nextOwner?.name || "seçilen kullanıcı"} üzerine aktarılsın mı?`
        : `Transfer ${agency.name} to ${nextOwner?.name || "selected user"}?`,
    );

    if (!ok) return;

    setSavingAgencyId(agency.id);
    setErr("");
    setNotice("");

    try {
      await authedFetch(`/agencies/${agency.id}/assign-sales`, {
        method: "POST",
        body: JSON.stringify({ salesId: nextOwnerId }),
      });

      await load();
      setNotice(locale === "tr" ? "Ajans sorumlusu güncellendi." : "Agency representative updated.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingAgencyId("");
    }
  }

  async function transferSelectedAgencies() {
    if (!canManageAgencyAssignments || selectedAgencyIds.length === 0 || !bulkAgencyOwnerId) return;

    const nextOwner = assignableUsers.find((user) => user.id === bulkAgencyOwnerId);
    const selectedAgencies = agencies.filter((agency) =>
      selectedAgencyIds.includes(agency.id),
    );
    const changedAgencies = selectedAgencies.filter(
      (agency) => agency.assignedSales?.id !== bulkAgencyOwnerId,
    );

    if (changedAgencies.length === 0) {
      setNotice(
        locale === "tr"
          ? "Seçili ajanslar zaten bu kullanıcıda."
          : "Selected agencies already belong to this representative.",
      );
      return;
    }

    const ok = window.confirm(
      locale === "tr"
        ? `${changedAgencies.length} ajans ${nextOwner?.name || "seçilen kullanıcı"} üzerine aktarılsın mı?`
        : `Transfer ${changedAgencies.length} agencies to ${nextOwner?.name || "selected user"}?`,
    );

    if (!ok) return;

    setBulkAgencySaving(true);
    setErr("");
    setNotice("");

    try {
      await Promise.all(
        changedAgencies.map((agency) =>
          authedFetch(`/agencies/${agency.id}/assign-sales`, {
            method: "POST",
            body: JSON.stringify({ salesId: bulkAgencyOwnerId }),
          }),
        ),
      );

      await load();
      setSelectedAgencyIds([]);
      setBulkAgencyOwnerId("");
      setNotice(
        locale === "tr"
          ? `${changedAgencies.length} ajans aktarıldı.`
          : `${changedAgencies.length} agencies transferred.`,
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBulkAgencySaving(false);
    }
  }

  function changeWorkspaceScope(nextScope: WorkspaceScope) {
    setWorkspaceScope(nextScope);
    setSelectedCustomerIds([]);
    setSelectedAgencyIds([]);
    setBulkOwnerId("");
    setBulkAgencyOwnerId("");
    setNotice("");
    setErr("");
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (mounted && canUseWorkspace) load();
  }, [mounted, canUseWorkspace, canUseAgencyWorkspace, isAllScope]);

  useEffect(() => {
    if (mounted && !canUseAllScope && workspaceScope === "all") {
      changeWorkspaceScope("mine");
    }
  }, [mounted, canUseAllScope, workspaceScope]);

  useEffect(() => {
    if (mounted && !canUseAgencyWorkspace && activeTab === "AGENCIES") {
      setActiveTab("CUSTOMERS");
    }
  }, [activeTab, canUseAgencyWorkspace, mounted]);

  const filteredCustomers = useMemo(() => {
    const search = q.trim().toLowerCase();

    return customers.filter((customer) => {
      if (typeFilter !== "ALL" && customer.type !== typeFilter) return false;
      if (!search) return true;

      return [
        customer.fullName,
        customer.companyName,
        customer.phone,
        customer.email,
        customer.city,
        customer.country,
        customer.agency?.name,
        customer.owner?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
      });
  }, [customers, q, typeFilter]);

  const filteredAgencies = useMemo(() => {
    const search = q.trim().toLowerCase();

    return agencies.filter((agency) => {
      if (!search) return true;

      return [
        agency.name,
        agency.contactName,
        agency.phone,
        agency.email,
        agency.city,
        agency.country,
        agency.assignedSales?.name,
        agency.assignedSales?.email,
        agency.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [agencies, q]);

  const allFilteredSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((customer) => selectedCustomerIds.includes(customer.id));

  const allFilteredAgenciesSelected =
    filteredAgencies.length > 0 &&
    filteredAgencies.every((agency) => selectedAgencyIds.includes(agency.id));

  function toggleCustomerSelection(customerId: string) {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId],
    );
  }

  function toggleFilteredSelection() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredCustomers.map((customer) => customer.id));
      setSelectedCustomerIds((prev) => prev.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedCustomerIds((prev) =>
      Array.from(new Set([...prev, ...filteredCustomers.map((customer) => customer.id)])),
    );
  }

  function toggleAgencySelection(agencyId: string) {
    setSelectedAgencyIds((prev) =>
      prev.includes(agencyId)
        ? prev.filter((id) => id !== agencyId)
        : [...prev, agencyId],
    );
  }

  function toggleFilteredAgencySelection() {
    if (allFilteredAgenciesSelected) {
      const filteredIds = new Set(filteredAgencies.map((agency) => agency.id));
      setSelectedAgencyIds((prev) => prev.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedAgencyIds((prev) =>
      Array.from(new Set([...prev, ...filteredAgencies.map((agency) => agency.id)])),
    );
  }

  const upcomingPresentationRows = useMemo(() => {
    const now = new Date();
    return presentations
      .filter((row) => new Date(row.presentationAt) >= now && row.status !== "CANCELLED")
      .slice(0, 6);
  }, [presentations]);

  if (!mounted) return <div>{locale === "tr" ? "Yükleniyor..." : "Loading..."}</div>;

  if (!canUseWorkspace) {
    return (
      <section className="workspace-panel">
        <h2>{locale === "tr" ? "Müşteri çalışma alanı" : "Customer workspace"}</h2>
        <p>
          {locale === "tr"
            ? "Bu alan satış, yönetici ve admin rolleri için kullanılabilir."
            : "This workspace is available for sales, manager and admin roles."}
        </p>
        <style jsx>{workspaceStyles}</style>
      </section>
    );
  }

  return (
    <div className="workspace">
      <section className="workspace-overview">
        <div className="workspace-heading">
          <span>{locale === "tr" ? "Kişisel müşteri alanı" : "Personal customer workspace"}</span>
          <h2>{locale === "tr" ? "Müşteri ve sunum özeti" : "Customer and presentation summary"}</h2>
        </div>
        <div className="workspace-overview-actions">
          {canUseAllScope ? (
            <div className="scope-switch" role="group" aria-label="Customer scope">
              <button
                className={!isAllScope ? "active" : ""}
                onClick={() => changeWorkspaceScope("mine")}
                type="button"
              >
                {locale === "tr" ? "Müşterilerim" : "My customers"}
              </button>
              <button
                className={isAllScope ? "active" : ""}
                onClick={() => changeWorkspaceScope("all")}
                type="button"
              >
                {locale === "tr" ? "Tüm müşteriler" : "All customers"}
              </button>
            </div>
          ) : null}
          <button onClick={load} disabled={loading}>
            {loading
              ? locale === "tr"
                ? "Yükleniyor..."
                : "Loading..."
              : locale === "tr"
                ? "Yenile"
                : "Refresh"}
          </button>
        </div>
      </section>

      <section className="workspace-stats">
        <WorkspaceStat
          label={
            isAllScope
              ? locale === "tr"
                ? "Tüm müşteriler"
                : "All customers"
              : locale === "tr"
                ? "Müşterilerim"
                : "My customers"
          }
          value={Number(stats.customers || 0)}
          detail={`${stats.potentialCustomers || 0} ${locale === "tr" ? "potansiyel" : "potential"} / ${stats.existingCustomers || 0} ${locale === "tr" ? "mevcut" : "existing"}`}
          tone="blue"
        />
        <WorkspaceStat
          label={
            isAllScope
              ? locale === "tr"
                ? "Tüm sunumlar"
                : "All presentations"
              : locale === "tr"
                ? "Sunumlarım"
                : "My presentations"
          }
          value={Number(stats.presentations || 0)}
          detail={`${stats.completedPresentations || 0} ${locale === "tr" ? "tamamlandı" : "completed"}`}
          tone="green"
        />
        <WorkspaceStat
          label={locale === "tr" ? "Yaklaşan sunum" : "Upcoming"}
          value={Number(stats.upcomingPresentations || 0)}
          detail={locale === "tr" ? "Planlanan görüşmeler" : "Scheduled meetings"}
          tone="amber"
        />
        {canUseAgencyWorkspace ? (
          <WorkspaceStat
            label={
              isAllScope
                ? locale === "tr"
                  ? "Tüm ajanslar"
                  : "All agencies"
                : locale === "tr"
                  ? "Ajanslarım"
                  : "My agencies"
            }
            value={agencies.length}
            detail={`${activeAgencyCount} ${locale === "tr" ? "aktif / görüşmede" : "active / dealing"}`}
            tone="neutral"
          />
        ) : null}
      </section>

      <section className="workspace-grid">
        <div className="workspace-panel workspace-main">
          <div className="workspace-toolbar">
            <div className="workspace-tabs" role="tablist" aria-label="Profile workspace">
              <button
                className={activeTab === "CUSTOMERS" ? "active" : ""}
                onClick={() => setActiveTab("CUSTOMERS")}
                type="button"
              >
                {locale === "tr" ? "Müşteriler" : "Customers"}
              </button>
              <button
                className={activeTab === "PRESENTATIONS" ? "active" : ""}
                onClick={() => setActiveTab("PRESENTATIONS")}
                type="button"
              >
                {locale === "tr" ? "Sunumlar" : "Presentations"}
              </button>
              {canUseAgencyWorkspace ? (
                <button
                  className={activeTab === "AGENCIES" ? "active" : ""}
                  onClick={() => setActiveTab("AGENCIES")}
                  type="button"
                >
                  {locale === "tr" ? "Ajanslar" : "Agencies"}
                </button>
              ) : null}
            </div>

            <div className="workspace-filters">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={
                  activeTab === "AGENCIES"
                    ? locale === "tr"
                      ? "Ajans, iletişim, telefon, e-posta veya sorumlu ara..."
                      : "Search agency, contact, phone, email or representative..."
                    : locale === "tr"
                      ? "Müşteri, telefon, e-posta, ajans veya sorumlu ara..."
                      : "Search customer, phone, email, agency or owner..."
                }
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                disabled={activeTab !== "CUSTOMERS"}
              >
                <option value="ALL">{locale === "tr" ? "Tüm tipler" : "All types"}</option>
                <option value="POTENTIAL">{customerTypeLabel("POTENTIAL", locale)}</option>
                <option value="EXISTING">{customerTypeLabel("EXISTING", locale)}</option>
              </select>
              <button
                onClick={() => {
                  setQ("");
                  setTypeFilter("ALL");
                }}
                type="button"
              >
                {locale === "tr" ? "Temizle" : "Clear"}
              </button>
            </div>
          </div>

          {err ? <div className="workspace-alert danger">{err}</div> : null}
          {notice ? <div className="workspace-alert success">{notice}</div> : null}

          {activeTab === "CUSTOMERS" ? (
            <div className="workspace-list">
              <div className="bulk-bar">
                <label className="bulk-check">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleFilteredSelection}
                    disabled={filteredCustomers.length === 0}
                  />
                  <span>
                    {locale === "tr"
                      ? "Filtrelenenleri seç"
                      : "Select filtered"}
                  </span>
                </label>

                <div className="bulk-summary">
                  {selectedCustomerIds.length}{" "}
                  {locale === "tr" ? "müşteri seçili" : "customers selected"}
                </div>

                <select
                  value={bulkOwnerId}
                  onChange={(event) => setBulkOwnerId(event.target.value)}
                  disabled={selectedCustomerIds.length === 0}
                >
                  <option value="">
                    {locale === "tr" ? "Yeni sorumlu seç" : "Select new owner"}
                  </option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.role ? `- ${user.role}` : ""}
                    </option>
                  ))}
                </select>

                <button
                  onClick={transferSelectedCustomers}
                  disabled={
                    selectedCustomerIds.length === 0 || !bulkOwnerId || bulkSaving
                  }
                  type="button"
                >
                  {bulkSaving
                    ? locale === "tr"
                      ? "Aktarılıyor..."
                      : "Transferring..."
                    : locale === "tr"
                      ? "Toplu aktar"
                      : "Bulk transfer"}
                </button>
              </div>

              {filteredCustomers.map((customer) => {
                const selectedOwnerId = ownerDrafts[customer.id] || "";
                const unchanged = selectedOwnerId === (customer.owner?.id || "");
                const units = customer.unitSelections || [];

                return (
                  <article className="customer-row" key={customer.id}>
                    <label className="row-check" aria-label={customer.fullName}>
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                      />
                    </label>

                    <div className="customer-primary">
                      <div className="record-title">
                        <Link href={`/customers/${customer.id}`}>{customer.fullName}</Link>
                        <span className={`badge ${customer.type === "EXISTING" ? "success" : "info"}`}>
                          {customerTypeLabel(customer.type, locale)}
                        </span>
                      </div>
                      <div className="record-subtitle">{emptyValue(customer.companyName)}</div>
                      <div className="record-meta">
                        <span>{emptyValue(customer.phone)}</span>
                        <span>{emptyValue(customer.email)}</span>
                        <span>
                          {[customer.city, customer.country].filter(Boolean).join(", ") || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="customer-context">
                      <span>{customer.agency?.name || "-"}</span>
                      <small>
                        {units.length > 0
                          ? units
                              .slice(0, 2)
                              .map((unit) => `${projectLabel(unit.project)} ${unit.unitNumber}`)
                              .join(", ")
                          : locale === "tr"
                            ? "Ünite yok"
                            : "No unit"}
                      </small>
                    </div>

                    <div className="customer-counts">
                      <strong>{customer._count?.presentations || 0}</strong>
                      <span>{locale === "tr" ? "sunum" : "presentations"}</span>
                      <small>
                        {customer._count?.unitSelections || 0}{" "}
                        {locale === "tr" ? "ünite" : "units"} /{" "}
                        {customer._count?.documents || 0} docs
                      </small>
                    </div>

                    <div className="transfer-box">
                      <label>
                        <span>{locale === "tr" ? "Sorumlu" : "Owner"}</span>
                        <select
                          value={selectedOwnerId}
                          onChange={(event) =>
                            setOwnerDrafts((prev) => ({
                              ...prev,
                              [customer.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">
                            {locale === "tr" ? "Sorumlu seç" : "Select owner"}
                          </option>
                          {assignableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} {user.role ? `- ${user.role}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => transferCustomer(customer)}
                        disabled={!selectedOwnerId || unchanged || savingId === customer.id}
                        type="button"
                      >
                        {savingId === customer.id
                          ? locale === "tr"
                            ? "Aktarılıyor..."
                            : "Saving..."
                          : locale === "tr"
                            ? "Aktar"
                            : "Transfer"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {filteredCustomers.length === 0 ? (
                <div className="workspace-empty">
                  {loading
                    ? locale === "tr"
                      ? "Yükleniyor..."
                      : "Loading..."
                    : locale === "tr"
                      ? "Müşteri bulunamadı."
                      : "No customers found."}
                </div>
              ) : null}
            </div>
          ) : activeTab === "AGENCIES" ? (
            <div className="workspace-list">
              {canManageAgencyAssignments ? (
                <div className="bulk-bar">
                  <label className="bulk-check">
                    <input
                      type="checkbox"
                      checked={allFilteredAgenciesSelected}
                      onChange={toggleFilteredAgencySelection}
                      disabled={filteredAgencies.length === 0}
                    />
                    <span>
                      {locale === "tr"
                        ? "Filtrelenen ajansları seç"
                        : "Select filtered agencies"}
                    </span>
                  </label>

                  <div className="bulk-summary">
                    {selectedAgencyIds.length}{" "}
                    {locale === "tr" ? "ajans seçili" : "agencies selected"}
                  </div>

                  <select
                    value={bulkAgencyOwnerId}
                    onChange={(event) => setBulkAgencyOwnerId(event.target.value)}
                    disabled={selectedAgencyIds.length === 0}
                  >
                    <option value="">
                      {locale === "tr" ? "Yeni temsilci seç" : "Select new representative"}
                    </option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.role ? `- ${user.role}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={transferSelectedAgencies}
                    disabled={
                      selectedAgencyIds.length === 0 ||
                      !bulkAgencyOwnerId ||
                      bulkAgencySaving
                    }
                    type="button"
                  >
                    {bulkAgencySaving
                      ? locale === "tr"
                        ? "Aktarılıyor..."
                        : "Transferring..."
                      : locale === "tr"
                        ? "Toplu aktar"
                        : "Bulk transfer"}
                  </button>
                </div>
              ) : null}

              {filteredAgencies.map((agency) => {
                const selectedOwnerId = agencyDrafts[agency.id] || "";
                const unchanged = selectedOwnerId === (agency.assignedSales?.id || "");

                return (
                  <article className="customer-row agency-row" key={agency.id}>
                    <label className="row-check" aria-label={agency.name}>
                      <input
                        type="checkbox"
                        checked={selectedAgencyIds.includes(agency.id)}
                        onChange={() => toggleAgencySelection(agency.id)}
                        disabled={!canManageAgencyAssignments}
                      />
                    </label>

                    <div className="customer-primary">
                      <div className="record-title">
                        <Link href={`/agencies/${agency.id}`}>{agency.name}</Link>
                        <span className={`badge ${agencyStatusTone(agency.status)}`}>
                          {agencyStatusLabel(agency.status, locale)}
                        </span>
                      </div>
                      <div className="record-subtitle">{emptyValue(agency.contactName)}</div>
                      <div className="record-meta">
                        <span>{emptyValue(agency.phone)}</span>
                        <span>{emptyValue(agency.email)}</span>
                        <span>
                          {[agency.city, agency.country].filter(Boolean).join(", ") || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="customer-context">
                      <span>{agency.assignedSales?.name || "-"}</span>
                      <small>
                        {agency.assignedSales?.role
                          ? `${agency.assignedSales.role} / ${agency.assignedSales.email || "-"}`
                          : agency.assignedSales?.email || "-"}
                      </small>
                    </div>

                    <div className="customer-counts">
                      <strong>{agency._count?.meetings || 0}</strong>
                      <span>{locale === "tr" ? "görüşme" : "meetings"}</span>
                      <small>
                        {agency._count?.notes || 0} {locale === "tr" ? "not" : "notes"} /{" "}
                        {agency._count?.tasks || 0} {locale === "tr" ? "görev" : "tasks"}
                      </small>
                    </div>

                    <div className="transfer-box">
                      <label>
                        <span>{locale === "tr" ? "Temsilci" : "Representative"}</span>
                        <select
                          value={selectedOwnerId}
                          onChange={(event) =>
                            setAgencyDrafts((prev) => ({
                              ...prev,
                              [agency.id]: event.target.value,
                            }))
                          }
                          disabled={!canManageAgencyAssignments}
                        >
                          <option value="">
                            {locale === "tr" ? "Temsilci seç" : "Select representative"}
                          </option>
                          {assignableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} {user.role ? `- ${user.role}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => transferAgency(agency)}
                        disabled={
                          !canManageAgencyAssignments ||
                          !selectedOwnerId ||
                          unchanged ||
                          savingAgencyId === agency.id
                        }
                        type="button"
                      >
                        {savingAgencyId === agency.id
                          ? locale === "tr"
                            ? "Aktarılıyor..."
                            : "Saving..."
                          : locale === "tr"
                            ? "Aktar"
                            : "Transfer"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {filteredAgencies.length === 0 ? (
                <div className="workspace-empty">
                  {loading
                    ? locale === "tr"
                      ? "Yükleniyor..."
                      : "Loading..."
                    : locale === "tr"
                      ? "Ajans bulunamadı."
                      : "No agencies found."}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="workspace-list">
              {presentations.map((presentation) => (
                <article className="presentation-row" key={presentation.id}>
                  <div className="customer-primary">
                    <div className="record-title">
                      <span>{presentation.title}</span>
                      <span className={`badge ${statusTone(presentation.status)}`}>
                        {statusLabel(presentation.status, locale)}
                      </span>
                    </div>
                    <div className="record-subtitle">
                      {presentation.projectName || presentation.location || "-"}
                    </div>
                  </div>

                  <div className="customer-context">
                    {presentation.customer?.id ? (
                      <Link href={`/customers/${presentation.customer.id}`}>
                        {presentation.customer.fullName}
                      </Link>
                    ) : (
                      <span>-</span>
                    )}
                    <small>{presentation.customer?.companyName || "-"}</small>
                  </div>

                  <div className="presentation-date">
                    <strong>{formatDateTime(presentation.presentationAt, locale)}</strong>
                    <small>
                      {locale === "tr" ? "Sorumlu" : "Assigned"}:{" "}
                      {presentation.assignedSales?.name || "-"}
                    </small>
                  </div>
                </article>
              ))}

              {presentations.length === 0 ? (
                <div className="workspace-empty">
                  {locale === "tr" ? "Sunum bulunamadı." : "No presentations found."}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <aside className="workspace-panel workspace-side">
          <div className="side-head">
            <span>{locale === "tr" ? "Yaklaşan" : "Upcoming"}</span>
            <strong>{locale === "tr" ? "Sunum takibi" : "Presentation follow-up"}</strong>
          </div>

          <div className="upcoming-list">
            {upcomingPresentationRows.map((presentation) => (
              <div className="upcoming-item" key={`upcoming-${presentation.id}`}>
                <div>
                  <strong>{presentation.title}</strong>
                  <span>{presentation.customer?.fullName || "-"}</span>
                </div>
                <small>{formatDateTime(presentation.presentationAt, locale)}</small>
              </div>
            ))}

            {upcomingPresentationRows.length === 0 ? (
              <div className="workspace-empty compact">
                {locale === "tr" ? "Yaklaşan sunum yok." : "No upcoming presentations."}
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      <style jsx>{workspaceStyles}</style>
    </div>
  );
}

const workspaceStyles = `
  .workspace {
    display: grid;
    gap: 14px;
  }

  .workspace-overview {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 12px;
    flex-wrap: wrap;
  }

  .workspace-overview-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .scope-switch {
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface-2);
  }

  .scope-switch button {
    min-height: 38px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    box-shadow: none;
    white-space: nowrap;
  }

  .scope-switch button.active {
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }

  .workspace-heading {
    display: grid;
    gap: 4px;
  }

  .workspace-heading span,
  .side-head span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .workspace-heading h2 {
    margin: 0;
    font-size: 22px;
  }

  .workspace-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .workspace-stat {
    display: grid;
    gap: 8px;
    min-height: 116px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    padding: 16px;
    align-content: space-between;
    position: relative;
    overflow: hidden;
  }

  .workspace-stat::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--stroke-2);
  }

  .workspace-stat.blue::before { background: var(--info); }
  .workspace-stat.green::before { background: var(--success); }
  .workspace-stat.amber::before { background: var(--warning); }

  .workspace-stat span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 850;
  }

  .workspace-stat strong {
    font-size: 30px;
    line-height: 1;
  }

  .workspace-stat small {
    color: var(--text-muted);
    line-height: 1.35;
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 14px;
    align-items: start;
  }

  .workspace-panel {
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    padding: 14px;
  }

  .workspace-main {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .workspace-toolbar {
    display: grid;
    gap: 12px;
  }

  .workspace-tabs {
    display: inline-grid;
    grid-template-columns: repeat(3, minmax(110px, 1fr));
    gap: 4px;
    width: fit-content;
    padding: 4px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface-2);
  }

  .workspace-tabs button {
    height: 34px;
    border-radius: 6px;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .workspace-tabs button.active {
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .workspace-filters {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 180px auto;
    gap: 10px;
  }

  .workspace-alert {
    border-radius: 8px;
    padding: 11px 12px;
    white-space: pre-wrap;
  }

  .workspace-alert.danger {
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.08);
  }

  .workspace-alert.success {
    border: 1px solid rgba(34, 197, 94, 0.35);
    background: rgba(34, 197, 94, 0.08);
  }

  .workspace-list {
    display: grid;
    gap: 8px;
  }

  .bulk-bar {
    display: grid;
    grid-template-columns: auto minmax(130px, 0.5fr) minmax(190px, 1fr) auto;
    gap: 10px;
    align-items: center;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface-2);
    padding: 10px;
  }

  .bulk-check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 850;
    white-space: nowrap;
  }

  .bulk-check input,
  .row-check input {
    width: 18px;
    height: 18px;
    padding: 0;
    margin: 0;
    accent-color: var(--primary);
  }

  .bulk-summary {
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
  }

  .customer-row,
  .presentation-row {
    display: grid;
    grid-template-columns: 28px minmax(220px, 1.35fr) minmax(150px, 0.75fr) minmax(96px, 0.4fr) minmax(180px, 0.75fr);
    gap: 12px;
    align-items: center;
    min-width: 0;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface-2);
    padding: 12px;
  }

  .presentation-row {
    grid-template-columns: minmax(260px, 1.2fr) minmax(180px, 0.8fr) minmax(220px, 0.8fr);
  }

  .row-check {
    display: grid;
    place-items: center;
    align-self: stretch;
  }

  .customer-primary,
  .customer-context,
  .customer-counts,
  .presentation-date,
  .transfer-box {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .record-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .record-title a,
  .record-title span:first-child {
    font-weight: 900;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .record-subtitle,
  .record-meta,
  .customer-context small,
  .customer-counts span,
  .customer-counts small,
  .presentation-date small,
  .upcoming-item span,
  .upcoming-item small {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .record-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .record-meta span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .customer-context > span,
  .customer-context > a {
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .customer-counts strong {
    font-size: 20px;
    line-height: 1;
  }

  .transfer-box {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    align-items: stretch;
  }

  .transfer-box label {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .transfer-box label span {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .transfer-box select {
    min-width: 0;
    height: 38px;
  }

  .transfer-box button {
    width: 100%;
  }

  .workspace-side {
    display: grid;
    gap: 12px;
    position: sticky;
    top: 12px;
  }

  .side-head {
    display: grid;
    gap: 3px;
  }

  .side-head strong {
    font-size: 17px;
  }

  .upcoming-list {
    display: grid;
    gap: 8px;
  }

  .upcoming-item {
    display: grid;
    gap: 8px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface-2);
    padding: 11px;
  }

  .upcoming-item div {
    display: grid;
    gap: 3px;
  }

  .upcoming-item strong {
    overflow-wrap: anywhere;
  }

  .workspace-empty {
    border: 1px dashed var(--stroke);
    border-radius: 8px;
    padding: 16px;
    color: var(--text-secondary);
    background: var(--surface-2);
  }

  .workspace-empty.compact {
    padding: 12px;
    font-size: 13px;
  }

  .workspace-panel h2 {
    margin: 0;
  }

  .workspace-panel p {
    margin: 0;
  }

  @media (max-width: 1200px) {
    .workspace-grid {
      grid-template-columns: 1fr;
    }

    .workspace-side {
      position: static;
    }
  }

  @media (max-width: 980px) {
    .workspace-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .customer-row,
    .presentation-row {
      grid-template-columns: 1fr;
    }

    .row-check {
      justify-content: start;
      place-items: start;
    }

    .transfer-box {
      grid-template-columns: 1fr auto;
    }
  }

  @media (max-width: 640px) {
    .workspace-stats,
    .workspace-filters,
    .bulk-bar,
    .transfer-box {
      grid-template-columns: 1fr;
    }

    .workspace-overview-actions,
    .scope-switch {
      width: 100%;
    }

    .bulk-check,
    .bulk-summary {
      white-space: normal;
    }

    .workspace-tabs {
      width: 100%;
    }
  }
`;
