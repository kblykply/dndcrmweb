"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Headset,
  Inbox,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { errorText, useSupportWorkspace } from "./_lib/client";
import {
  categoryLabel,
  formatDateTime,
  isOverdue,
  priorityLabel,
  statusLabel,
  typeLabel,
} from "./_lib/model";
import {
  categories,
  priorities,
  statuses,
  ticketTypes,
  type Scope,
  type TicketList,
  type TicketType,
} from "./_lib/types";
import CreateTicketForm from "./_components/CreateTicketForm";
import s from "./support.module.css";

export default function ItSupportPage() {
  const { locale } = useLanguage();
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  const router = useRouter();
  const {
    workspace,
    loading: workspaceLoading,
    denied,
    error: workspaceError,
    reload,
  } = useSupportWorkspace();
  const [scopeChoice, setScopeChoice] = useState<Scope | null>(null);
  const scope = workspace?.canManage ? scopeChoice || "ALL" : "MINE";
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
    type: "",
  });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState<TicketList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refresh, setRefresh] = useState(0);
  const [create, setCreate] = useState<TicketType | null>(null);
  useEffect(() => {
    const nextSearch = query.trim();
    if (nextSearch === search) return;
    const timer = setTimeout(() => {
      setSearch(nextSearch);
      setSkip(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, search]);
  const params = new URLSearchParams({
    scope,
    q: search,
    ...filters,
    skip: String(skip),
    take: "30",
  }).toString();
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!workspace) return;
      setLoading(true);
      setError(null);
      try {
        const result = (await authedFetch(`/it-support/tickets?${params}`, {
          signal,
        })) as TicketList;
        if (!signal.aborted) setData(result);
      } catch (err) {
        if (!signal.aborted) {
          setError(err);
          setData(null);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [workspace, params],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refresh]);
  const filter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setSkip(0);
  };
  if (denied)
    return (
      <div className={s.page}>
        <div className={s.empty}>
          <ShieldCheck size={30} />
          <h1>{t("Çalışan hesabı gerekiyor", "Employee account required")}</h1>
          <p>
            {t(
              "IT Destek, aktif şirket hesaplarıyla kullanılabilir. Önizleme hesapları bu alana erişemez.",
              "IT Support is available to active employee accounts. Preview accounts cannot access this area.",
            )}
          </p>
        </div>
      </div>
    );
  if (!workspace)
    return (
      <div className={s.page}>
        <div className={s.empty}>
          {workspaceLoading ? (
            <p role="status">
              {t("IT Destek yükleniyor…", "Loading IT Support…")}
            </p>
          ) : (
            <>
              <p role="alert" className={s.error}>
                {errorText(workspaceError, locale)}
              </p>
              <button className={s.secondary} onClick={() => void reload()}>
                {t("Tekrar dene", "Retry")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  const tabs: { id: Scope; label: string }[] = workspace.canManage
    ? [
        { id: "ALL", label: t("Tüm talepler", "All tickets") },
        { id: "ASSIGNED", label: t("Bana atanan", "Assigned to me") },
        { id: "UNASSIGNED", label: t("Atanmamış", "Unassigned") },
        { id: "MINE", label: t("Taleplerim", "My tickets") },
      ]
    : [{ id: "MINE", label: t("Taleplerim", "My tickets") }];
  const stats = data?.stats;
  const filtered = !!(search || Object.values(filters).some(Boolean));
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>
            DND · {t("DESTEK MERKEZİ", "SERVICE DESK")}
          </div>
          <h1>{t("IT Destek", "IT Support")}</h1>
          <p className={s.muted}>
            {workspace.canManage
              ? t(
                  "Gelen talepleri değerlendir, işi üstlen ve çözümü birlikte takip et.",
                  "Review incoming tickets, take ownership and follow through to resolution.",
                )
              : t(
                  "Bir sorun mu var, yeni bir şeye mi ihtiyacın var? IT ekibine buradan ulaş.",
                  "Something not working, or need something new? Reach your IT team here.",
                )}
          </p>
        </div>
        <div className={s.actions}>
          {workspace.canManage && (
            <span className={s.access}>
              <ShieldCheck size={14} />
              {t("IT YÖNETİMİ", "IT MANAGEMENT")}
            </span>
          )}
          <button
            className={s.iconButton}
            aria-label={t("Yenile", "Refresh")}
            disabled={loading}
            onClick={() => setRefresh((n) => n + 1)}
          >
            <RefreshCw size={17} />
          </button>
          <button className={s.primary} onClick={() => setCreate("INCIDENT")}>
            <Plus size={17} />
            {t("Yeni ticket", "New ticket")}
          </button>
        </div>
      </header>
      <section
        className={s.requestOptions}
        aria-label={t("Nasıl yardımcı olabiliriz?", "How can we help?")}
      >
        <button
          className={s.requestOption}
          onClick={() => setCreate("INCIDENT")}
        >
          <span className={s.optionIcon}>
            <Wrench size={21} />
          </span>
          <span>
            <strong>{t("Bir sorun bildir", "Report a problem")}</strong>
            <small>
              {t(
                "Çalışmayan uygulama, cihaz veya bağlantı",
                "An application, device or connection is not working",
              )}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
        <button
          className={s.requestOption}
          onClick={() => setCreate("REQUEST")}
        >
          <span className={s.optionIcon}>
            <Headset size={22} />
          </span>
          <span>
            <strong>{t("Bir istekte bulun", "Request help")}</strong>
            <small>
              {t(
                "Erişim, kurulum, ekipman veya destek ihtiyacı",
                "Access, setup, equipment or assistance",
              )}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
      </section>
      <nav
        className={s.tabs}
        aria-label={t("Talep görünümleri", "Ticket views")}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={scope === tab.id ? s.activeTab : s.tab}
            aria-current={scope === tab.id ? "page" : undefined}
            onClick={() => {
              setScopeChoice(tab.id);
              setSkip(0);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <section
        className={s.metrics}
        aria-label={t("Seçili görünüm özeti", "Selected view summary")}
      >
        {[
          {
            label: t("Açık talepler", "Open tickets"),
            value: stats?.open,
            Icon: Inbox,
          },
          {
            label: t("Kullanıcıdan bilgi bekliyor", "Waiting for requester"),
            value: stats?.waitingRequester,
            Icon: MessageCircle,
          },
          {
            label: t("Çözüm onayı bekliyor", "Awaiting confirmation"),
            value: stats?.resolved,
            Icon: ShieldCheck,
          },
          ...(workspace.canManage
            ? [
                {
                  label: t(
                    "Atanmamış açık talepler",
                    "Unassigned open tickets",
                  ),
                  value: stats?.unassigned,
                  Icon: Headset,
                },
              ]
            : []),
          {
            label: t("Planlanan hedefi geçen", "Past planned target"),
            value: stats?.overdue,
            Icon: Clock3,
          },
        ].map(({ label, value, Icon }) => (
          <div className={s.metric} key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </section>
      <section
        className={s.panel}
        aria-label={t("Ticket listesi", "Ticket list")}
      >
        <div className={s.filters}>
          <label className={s.search}>
            <Search size={17} />
            <input
              aria-label={t("Ticket ara", "Search tickets")}
              placeholder={t(
                "Ticket no, konu veya uygulama ara…",
                "Search ticket number, subject or application…",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label={t("Durum filtresi", "Status filter")}
            value={filters.status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">{t("Tüm durumlar", "All statuses")}</option>
            {statuses.map((v) => (
              <option key={v} value={v}>
                {statusLabel(v, locale)}
              </option>
            ))}
          </select>
          <select
            aria-label={t("Öncelik filtresi", "Priority filter")}
            value={filters.priority}
            onChange={(e) => filter("priority", e.target.value)}
          >
            <option value="">{t("Tüm öncelikler", "All priorities")}</option>
            {priorities.map((v) => (
              <option key={v} value={v}>
                {priorityLabel(v, locale)}
              </option>
            ))}
          </select>
          <select
            aria-label={t("Kategori filtresi", "Category filter")}
            value={filters.category}
            onChange={(e) => filter("category", e.target.value)}
          >
            <option value="">{t("Tüm kategoriler", "All categories")}</option>
            {categories.map((v) => (
              <option key={v} value={v}>
                {categoryLabel(v, locale)}
              </option>
            ))}
          </select>
          <select
            aria-label={t("Tür filtresi", "Type filter")}
            value={filters.type}
            onChange={(e) => filter("type", e.target.value)}
          >
            <option value="">{t("Tüm türler", "All types")}</option>
            {ticketTypes.map((v) => (
              <option key={v} value={v}>
                {typeLabel(v, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className={s.listMeta}>
          <span aria-live="polite">
            {loading
              ? t("Yükleniyor…", "Loading…")
              : `${data?.total ?? 0} ${t("ticket", "tickets")}`}
          </span>
          {filtered && (
            <button
              className={s.textButton}
              onClick={() => {
                setQuery("");
                setSearch("");
                setFilters({
                  status: "",
                  priority: "",
                  category: "",
                  type: "",
                });
                setSkip(0);
              }}
            >
              {t("Filtreleri temizle", "Clear filters")}
            </button>
          )}
        </div>
        {error ? (
          <div className={s.empty}>
            <CircleAlert size={28} />
            <p className={s.error} role="alert">
              {errorText(error, locale)}
            </p>
            <button
              className={s.secondary}
              onClick={() => setRefresh((n) => n + 1)}
            >
              {t("Tekrar dene", "Retry")}
            </button>
          </div>
        ) : !data || (loading && !data.items.length) ? (
          <div className={s.empty} role="status">
            {t("Talepler yükleniyor…", "Loading tickets…")}
          </div>
        ) : !data.items.length ? (
          <div className={s.empty}>
            <Inbox size={34} />
            <h2>
              {filtered
                ? t("Eşleşen ticket bulunamadı", "No matching tickets")
                : t("Bu görünümde ticket yok", "No tickets in this view")}
            </h2>
            <p>
              {filtered
                ? t(
                    "Filtreleri değiştirerek tekrar deneyebilirsin.",
                    "Try changing the filters.",
                  )
                : t(
                    "Sorun veya isteğini yeni bir ticket açarak IT ekibine iletebilirsin.",
                    "Open a new ticket to share an issue or request with IT.",
                  )}
            </p>
            <button
              className={s.secondary}
              onClick={() => setCreate("INCIDENT")}
            >
              {t("Yeni ticket", "New ticket")}
            </button>
          </div>
        ) : (
          <div className={s.ticketList} aria-busy={loading}>
            <div className={s.tableHead} aria-hidden="true">
              <span>{t("Ticket / konu", "Ticket / subject")}</span>
              <span>{t("Durum / öncelik", "Status / priority")}</span>
              <span>
                {workspace.canManage
                  ? t("Talep sahibi / sorumlu", "Requester / assignee")
                  : t("IT sorumlusu", "IT assignee")}
              </span>
              <span>{t("Son güncelleme", "Last update")}</span>
            </div>
            {data.items.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/it-support/${ticket.id}`}
                className={s.ticketRow}
              >
                <div>
                  <span className={s.ticketCode}>{ticket.code}</span>
                  <h2>{ticket.subject}</h2>
                  <p>
                    {categoryLabel(ticket.category, locale)} ·{" "}
                    {ticket.system || typeLabel(ticket.type, locale)}
                  </p>
                </div>
                <div className={s.rowBadges}>
                  <span
                    className={s.badge}
                    data-tone={
                      ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                        ? "green"
                        : ticket.status.startsWith("WAITING")
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {statusLabel(ticket.status, locale)}
                  </span>
                  <span
                    className={s.badge}
                    data-tone={
                      ticket.priority === "URGENT"
                        ? "red"
                        : ticket.priority === "HIGH"
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {priorityLabel(ticket.priority, locale)}
                  </span>
                </div>
                <div className={s.people}>
                  {workspace.canManage && (
                    <strong>{ticket.requester.name}</strong>
                  )}
                  <span>
                    {ticket.assignee?.name ||
                      t("IT ataması bekleniyor", "Awaiting IT assignment")}
                  </span>
                </div>
                <div className={s.rowDate}>
                  <span>{formatDateTime(ticket.updatedAt, locale)}</span>
                  {ticket.dueAt && (
                    <small
                      className={isOverdue(ticket) ? s.overdue : undefined}
                    >
                      {t("Hedef", "Target")}:{" "}
                      {formatDateTime(ticket.dueAt, locale)}
                    </small>
                  )}
                  <ChevronRight size={17} />
                </div>
              </Link>
            ))}
          </div>
        )}
        {data && data.total > data.take && (
          <div className={s.pagination}>
            <span>
              {data.skip + 1}–
              {Math.min(data.skip + data.items.length, data.total)} /{" "}
              {data.total}
            </span>
            <div className={s.actions}>
              <button
                className={s.secondary}
                disabled={loading || skip === 0}
                onClick={() => setSkip(Math.max(0, skip - data.take))}
              >
                <ChevronLeft size={16} />
                {t("Önceki", "Previous")}
              </button>
              <button
                className={s.secondary}
                disabled={loading || skip + data.take >= data.total}
                onClick={() => setSkip(skip + data.take)}
              >
                {t("Sonraki", "Next")}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
      {create && (
        <CreateTicketForm
          locale={locale}
          initialType={create}
          onClose={() => setCreate(null)}
          onCreated={(detail) => router.push(`/it-support/${detail.ticket.id}`)}
        />
      )}
    </div>
  );
}
