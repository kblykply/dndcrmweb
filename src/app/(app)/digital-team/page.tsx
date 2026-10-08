"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  CircleAlert,
  Clock3,
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { useTeamWorkspace, errorText } from "./_lib/client";
import {
  emptyProject,
  filterProjects,
  formatDate,
  initials,
  isOverdue,
  memberName,
  portfolioMetrics,
} from "./_lib/model";
import {
  healthLabel,
  kindLabel,
  priorityLabel,
  statusLabel,
} from "./_lib/copy";
import {
  healthValues,
  projectStatuses,
  recordKinds,
  type ProjectDetail,
  type TeamMember,
} from "./_lib/types";
import ProjectForm from "./_components/ProjectForm";
import MemberForm from "./_components/MemberForm";
import s from "./digital-team.module.css";

export default function DigitalTeamPage() {
  const { locale } = useLanguage();
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  const router = useRouter();
  const { workspace, loading, denied, error, reload } = useTeamWorkspace();
  const [section, setSection] = useState("projects");
  const [filters, setFilters] = useState({
    query: "",
    status: "",
    kind: "",
    ownerId: "",
    health: "",
  });
  const [includeArchived, setIncludeArchived] = useState(false);
  const [create, setCreate] = useState(false);
  const [memberForm, setMemberForm] = useState<
    TeamMember | "new" | "me" | null
  >(null);
  if (denied)
    return (
      <div className={s.page}>
        <section className={s.empty}>
          <ShieldCheck size={30} />
          <h1>{t("Yalnızca ADMIN erişimi", "ADMIN access only")}</h1>
          <p>
            {t(
              "Dijital Ekip modülünü şu an yalnızca ADMIN kullanıcıları görebilir ve düzenleyebilir.",
              "Only ADMIN users can currently view and edit Digital Team.",
            )}
          </p>
        </section>
      </div>
    );
  if (!workspace)
    return (
      <div className={s.page}>
        <section className={s.empty}>
          {loading ? (
            <p role="status">
              {t("Dijital Ekip yükleniyor…", "Loading Digital Team…")}
            </p>
          ) : (
            <>
              <p className={s.error} role="alert">
                {errorText(error, locale)}
              </p>
              <button className={s.secondary} onClick={() => void reload()}>
                {t("Tekrar dene", "Retry")}
              </button>
            </>
          )}
        </section>
      </div>
    );
  const metrics = portfolioMetrics(workspace.projects);
  const projects = filterProjects(
    workspace.projects.filter(
      (p) =>
        includeArchived ||
        filters.status === "ARCHIVED" ||
        p.status !== "ARCHIVED",
    ),
    filters,
    workspace.members,
    locale,
  );
  const myMember = workspace.members.find(
    (m) => m.userId === workspace.me.id && m.isActive,
  );
  const initialMember =
    typeof memberForm === "object" && memberForm
      ? memberForm
      : {
          userId: memberForm === "me" ? workspace.me.id : null,
          name: memberForm === "me" ? workspace.me.name : "",
          title: "",
          contact: "",
          isActive: true,
        };
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>
            DND · {t("DİJİTAL OPERASYONLAR", "DIGITAL OPERATIONS")}
          </div>
          <h1>{t("Dijital Ekip", "Digital Team")}</h1>
          <p className={s.muted}>
            {t(
              "Neler üzerinde çalışıyoruz, kim sorumlu, sırada ne var?",
              "What are we working on, who owns it, and what comes next?",
            )}
          </p>
        </div>
        <div className={s.actions}>
          <span className={s.access}>
            <ShieldCheck size={14} /> ADMIN
          </span>
          <button
            className={s.iconButton}
            aria-label={t("Yenile", "Refresh")}
            disabled={loading}
            onClick={() => void reload()}
          >
            <RefreshCw size={17} />
          </button>
          <button
            className={s.primary}
            onClick={() => setCreate(true)}
            disabled={!workspace.canEdit}
          >
            <Plus size={17} />
            {t("Yeni proje / süreç", "New project / process")}
          </button>
        </div>
      </header>
      <section className={s.metrics} aria-label={t("Genel durum", "Overview")}>
        {[
          {
            value: metrics.activeProjects,
            label: t("Aktif proje", "Active projects"),
            Icon: FolderKanban,
            detail: t("Geliştirme devam ediyor", "Development in progress"),
          },
          {
            value: metrics.activeProcesses,
            label: t("Aktif süreç", "Active processes"),
            Icon: Activity,
            detail: t("Sürekli yürütülen işler", "Ongoing operations"),
          },
          {
            value: metrics.blockedRecords,
            label: t("Engel bekleyen", "Blocked records"),
            Icon: CircleAlert,
            detail: t(
              "Çözüm veya dış aksiyon gerekli",
              "Needs resolution or external action",
            ),
          },
          {
            value: metrics.overdueProjects,
            label: t("Hedefi geçen proje", "Overdue projects"),
            Icon: Clock3,
            detail: t(
              "Hedef tarihi gözden geçirilmeli",
              "Target date needs review",
            ),
          },
        ].map(({ value, label, Icon, detail }) => (
          <div key={label} className={s.metric}>
            <div className={s.metricTop}>
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </section>
      <nav
        className={s.tabs}
        aria-label={t("Dijital ekip bölümleri", "Digital team sections")}
      >
        <button
          className={section === "projects" ? s.activeTab : s.tab}
          aria-current={section === "projects" ? "page" : undefined}
          onClick={() => setSection("projects")}
        >
          <FolderKanban size={17} />
          {t("Projeler ve süreçler", "Projects and processes")}
        </button>
        <button
          className={section === "team" ? s.activeTab : s.tab}
          aria-current={section === "team" ? "page" : undefined}
          onClick={() => setSection("team")}
        >
          <Users size={17} />
          {t("Ekip", "Team")}{" "}
          <span>{workspace.members.filter((m) => m.isActive).length}</span>
        </button>
      </nav>
      {section === "projects" ? (
        <>
          <section className={s.filters} aria-label={t("Filtreler", "Filters")}>
            <label className={s.search}>
              <Search size={17} />
              <input
                aria-label={t(
                  "Proje veya süreç ara",
                  "Search projects or processes",
                )}
                placeholder={t(
                  "Proje, süreç veya sorumlu ara…",
                  "Search project, process or owner…",
                )}
                value={filters.query}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, query: e.target.value }))
                }
              />
            </label>
            <select
              aria-label={t("Kayıt türü filtresi", "Record type filter")}
              value={filters.kind}
              onChange={(e) =>
                setFilters((f) => ({ ...f, kind: e.target.value }))
              }
            >
              <option value="">{t("Tüm türler", "All types")}</option>
              {recordKinds.map((v) => (
                <option key={v} value={v}>
                  {kindLabel(v, locale)}
                </option>
              ))}
            </select>
            <select
              aria-label={t("Durum filtresi", "Status filter")}
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="">{t("Tüm durumlar", "All statuses")}</option>
              {projectStatuses.map((v) => (
                <option key={v} value={v}>
                  {statusLabel(v, locale)}
                </option>
              ))}
            </select>
            <select
              aria-label={t("Ana sorumlu filtresi", "Lead owner filter")}
              value={filters.ownerId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, ownerId: e.target.value }))
              }
            >
              <option value="">{t("Tüm sorumlular", "All owners")}</option>
              <option value="UNASSIGNED">{t("Atanmadı", "Unassigned")}</option>
              {workspace.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {!m.isActive ? t(" (pasif)", " (inactive)") : ""}
                </option>
              ))}
            </select>
            <select
              aria-label={t("Gidişat filtresi", "Health filter")}
              value={filters.health}
              onChange={(e) =>
                setFilters((f) => ({ ...f, health: e.target.value }))
              }
            >
              <option value="">
                {t("Tüm gidişatlar", "All health values")}
              </option>
              {healthValues.map((v) => (
                <option key={v} value={v}>
                  {healthLabel(v, locale)}
                </option>
              ))}
            </select>
          </section>
          <div className={s.listMeta}>
            <span>
              {projects.length} {t("kayıt", "records")}
            </span>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              {t("Arşivi dahil et", "Include archive")}
            </label>
          </div>
          {!projects.length ? (
            <section className={s.empty}>
              <FolderKanban size={36} />
              <h2>
                {workspace.projects.length
                  ? t("Bu filtrelere uygun kayıt yok", "No matching records")
                  : t(
                      "Ekibin çalışmalarını tek yerde topla",
                      "Bring the team's work together",
                    )}
              </h2>
              <p>
                {workspace.projects.length
                  ? t(
                      "Arama veya filtreleri değiştirerek tekrar dene.",
                      "Try changing the search or filters.",
                    )
                  : t(
                      "Bir proje veya sürekli süreç aç. Sorumluları, iş bölümlerini ve dış etkenleri ekleyerek güncel durumu görünür kıl.",
                      "Create a project or ongoing process. Add owners, responsibilities and external factors to share its current status.",
                    )}
              </p>
              <button
                className={s.primary}
                onClick={() =>
                  workspace.projects.length
                    ? (setFilters({
                        query: "",
                        status: "",
                        kind: "",
                        ownerId: "",
                        health: "",
                      }),
                      setIncludeArchived(false))
                    : setCreate(true)
                }
              >
                {workspace.projects.length
                  ? t("Filtreleri temizle", "Clear filters")
                  : t("İlk kaydı oluştur", "Create the first record")}
              </button>
            </section>
          ) : (
            <div className={s.projectGrid}>
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/digital-team/${p.id}`}
                  className={s.projectCard}
                >
                  <div className={s.cardHeading}>
                    <span className={s.kind}>{kindLabel(p.kind, locale)}</span>
                    <ArrowUpRight size={18} />
                  </div>
                  <h2>{p.name}</h2>
                  <p className={s.summary}>
                    {p.summary || t("Henüz özet eklenmedi.", "No summary yet.")}
                  </p>
                  <div className={s.badges}>
                    <span
                      className={s.badge}
                      data-tone={p.status === "ACTIVE" ? "green" : "neutral"}
                    >
                      {statusLabel(p.status, locale)}
                    </span>
                    <span
                      className={s.badge}
                      data-tone={
                        p.health === "BLOCKED"
                          ? "red"
                          : p.health === "AT_RISK"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {healthLabel(p.health, locale)}
                    </span>
                    {p.priority !== "NORMAL" && (
                      <span className={s.badge}>
                        {priorityLabel(p.priority, locale)}
                      </span>
                    )}
                  </div>
                  <div className={s.cardProgress}>
                    {p.kind === "PROJECT" ? (
                      <>
                        <div>
                          <span>{t("İlerleme", "Progress")}</span>
                          <strong>
                            {p.progress === null
                              ? t("Belirtilmedi", "Not specified")
                              : `${p.progress}%`}
                          </strong>
                        </div>
                        {p.progress !== null && (
                          <progress
                            max={100}
                            value={p.progress}
                            aria-label={`${p.name} ${t("ilerleme", "progress")}`}
                          />
                        )}
                      </>
                    ) : (
                      <div>
                        <span>{t("Çalışma sıklığı", "Cadence")}</span>
                        <strong>{p.cadence || "—"}</strong>
                      </div>
                    )}
                  </div>
                  <dl className={s.cardMeta}>
                    <div>
                      <dt>{t("Ana sorumlu", "Lead owner")}</dt>
                      <dd>
                        {memberName(workspace.members, p.ownerId, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Hedef", "Target")}</dt>
                      <dd className={isOverdue(p) ? s.overdue : undefined}>
                        {formatDate(p.targetDate, locale)}
                      </dd>
                    </div>
                  </dl>
                  <div className={s.nextStep}>
                    <span>{t("SONRAKİ ADIM", "NEXT STEP")}</span>
                    <p>
                      {p.nextStep ||
                        t("Henüz belirtilmedi", "Not specified yet")}
                    </p>
                  </div>
                  <div className={s.cardFooter}>
                    <span>
                      {p.doneWorkstreamCount}/{p.workstreamCount}{" "}
                      {t("iş bölümü", "workstreams")}
                    </span>
                    <span
                      className={p.blockingFactorCount ? s.overdue : undefined}
                    >
                      {p.openFactorCount} {t("açık dış etken", "open factors")}
                    </span>
                  </div>
                  <div className={s.lastUpdate}>
                    {p.lastUpdate ? (
                      <>
                        <p>{p.lastUpdate.body}</p>
                        <small>
                          {p.lastUpdate.actorName} ·{" "}
                          {formatDate(p.lastUpdate.createdAt, locale)}
                        </small>
                      </>
                    ) : (
                      <small>
                        {t("Son değişiklik", "Last changed")}:{" "}
                        {formatDate(p.updatedAt, locale)} · {p.updatedByName}
                      </small>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <section className={s.panel}>
          <div className={s.panelHeader}>
            <div>
              <h2>{t("Dijital ekip", "Digital team")}</h2>
              <p className={s.muted}>
                {t(
                  "Sorumlulukları kişilere dağıt; ekibe yeni katılanları buradan ekle.",
                  "Assign responsibilities and add new team members here.",
                )}
              </p>
            </div>
            <button className={s.primary} onClick={() => setMemberForm("new")}>
              <Plus size={16} />
              {t("Üye ekle", "Add member")}
            </button>
          </div>
          {!workspace.members.length && (
            <div className={s.empty}>
              <Users size={32} />
              <h3>
                {t(
                  "Ekip kaydını oluşturarak başla",
                  "Start with your team profile",
                )}
              </h3>
              <p>
                {t(
                  "İlk ekip üyesi olarak kendini ekleyebilirsin. Daha sonra diğer sorumluları da eklersin.",
                  "Add yourself as the first team member, then add other contributors.",
                )}
              </p>
              <button
                className={s.secondary}
                onClick={() => setMemberForm("me")}
              >
                {t("Ekibe kendimi ekle", "Add myself to the team")}
              </button>
            </div>
          )}
          <div className={s.memberGrid}>
            {workspace.members.map((m) => {
              const owned = workspace.projects.filter(
                (p) =>
                  p.ownerId === m.id &&
                  !["COMPLETED", "ARCHIVED"].includes(p.status),
              );
              return (
                <article key={m.id} className={s.memberCard}>
                  <div className={s.memberHeading}>
                    <span className={s.avatar}>{initials(m.name)}</span>
                    <div>
                      <h3>{m.name}</h3>
                      <p className={s.muted}>
                        {m.title ||
                          t("Görev belirtilmedi", "Role not specified")}
                      </p>
                    </div>
                    <span
                      className={s.badge}
                      data-tone={m.isActive ? "green" : "neutral"}
                    >
                      {m.isActive
                        ? t("Aktif", "Active")
                        : t("Pasif", "Inactive")}
                    </span>
                  </div>
                  {m.contact && <p className={s.muted}>{m.contact}</p>}
                  <p>
                    {t(
                      "Ana sorumlu olduğu açık kayıtlar",
                      "Open records as lead owner",
                    )}
                    : <strong>{owned.length}</strong>
                  </p>
                  <div className={s.actions}>
                    <button
                      className={s.secondary}
                      onClick={() => {
                        setSection("projects");
                        setFilters({
                          query: "",
                          status: "",
                          kind: "",
                          ownerId: m.id,
                          health: "",
                        });
                      }}
                    >
                      {t("Çalışmalarını gör", "View work")}
                    </button>
                    <button
                      className={s.secondary}
                      onClick={() => setMemberForm(m)}
                    >
                      {t("Düzenle", "Edit")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {create && (
        <ProjectForm
          initial={emptyProject("PROJECT", myMember?.id || null)}
          members={workspace.members}
          locale={locale}
          onClose={() => setCreate(false)}
          onSubmit={async (value) => {
            const detail = (await authedFetch("/digital-team/projects", {
              method: "POST",
              body: JSON.stringify(value),
            })) as ProjectDetail;
            router.push(`/digital-team/${detail.project.id}`);
          }}
        />
      )}
      {memberForm && (
        <MemberForm
          initial={initialMember}
          candidates={workspace.candidates.filter(
            (p) =>
              p.id === initialMember.userId ||
              !workspace.members.some((m) => m.userId === p.id),
          )}
          locale={locale}
          onClose={() => setMemberForm(null)}
          onSubmit={async (value) => {
            const existing = typeof memberForm === "object" ? memberForm : null;
            await authedFetch(
              `/digital-team/members${existing ? `/${existing.id}` : ""}`,
              {
                method: existing ? "PUT" : "POST",
                body: JSON.stringify({
                  ...value,
                  ...(existing ? { version: existing.version } : {}),
                }),
              },
            );
            await reload();
          }}
        />
      )}
    </div>
  );
}
