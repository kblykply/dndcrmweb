"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Clock3,
  History,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  Send,
  Settings2,
  ShieldAlert,
  Ticket,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { errorText, useSupportWorkspace } from "../_lib/client";
import {
  categoryLabel,
  formatDateTime,
  impactLabel,
  isOverdue,
  priorityLabel,
  statusLabel,
  typeLabel,
  urgencyLabel,
} from "../_lib/model";
import type {
  Attachment,
  Entry,
  EntryPage,
  TicketAction,
  TicketDetail,
  TriageInput,
} from "../_lib/types";
import { Attachments, FilePicker } from "./Attachments";
import { TicketActionForm, TriageForm } from "./TicketDetailForms";
import s from "../support.module.css";
import d from "./detail.module.css";

type Editor = "triage" | TicketAction;
type Visibility = "PUBLIC" | "INTERNAL";
type ReplyDraft = { body: string; files: File[] };

export default function TicketDetailView({ id }: { id: string }) {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const {
    workspace,
    loading: workspaceLoading,
    denied,
    error: workspaceError,
    reload: reloadWorkspace,
  } = useSupportWorkspace();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [drafts, setDrafts] = useState<Record<Visibility, ReplyDraft>>({
    PUBLIC: { body: "", files: [] },
    INTERNAL: { body: "", files: [] },
  });
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [replyError, setReplyError] = useState<unknown>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const revision = useRef(0);
  const path = "/it-support/tickets/" + encodeURIComponent(id);
  const canManage = !!workspace?.canManage && !!detail?.canManage;
  const canReply = !!workspace && !!detail?.canReply && !loading && !busy;
  const activeVisibility = canManage ? visibility : "PUBLIC";
  const { body, files } = drafts[activeVisibility];
  const hasDraft = Object.values(drafts).some(
    (draft) => !!draft.body.trim() || draft.files.length > 0,
  );

  function updateDraft(update: Partial<ReplyDraft>) {
    setDrafts((current) => ({
      ...current,
      [activeVisibility]: { ...current[activeVisibility], ...update },
    }));
  }

  const applyDetail = useCallback((value: TicketDetail) => {
    revision.current += 1;
    setDetail(value);
    setEntries(value.entries);
    setNextCursor(value.nextCursor);
    setHistoryError(null);
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = (await authedFetch(path, { signal })) as TicketDetail;
        if (!signal?.aborted) applyDetail(result);
      } catch (error) {
        if (!signal?.aborted) setLoadError(error);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [path, applyDetail],
  );
  useEffect(() => {
    if (!workspace || denied) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [workspace, denied, load]);
  useEffect(() => {
    if (!hasDraft) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [hasDraft]);

  async function triage(input: TriageInput) {
    if (!canManage || busy)
      throw new Error(
        t(
          "Bu talebi yönetme yetkiniz yok.",
          "You do not have permission to manage this ticket.",
        ),
      );
    setBusy(true);
    try {
      applyDetail(
        (await authedFetch(path + "/triage", {
          method: "PUT",
          body: JSON.stringify(input),
        })) as TicketDetail,
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(input: {
    version: number;
    action: TicketAction;
    message: string;
  }) {
    if (!detail || !detail.actions.includes(input.action) || busy)
      throw new Error(
        t(
          "Bu işlem şu anda kullanılamıyor.",
          "This action is not currently available.",
        ),
      );
    setBusy(true);
    try {
      applyDetail(
        (await authedFetch(path + "/actions", {
          method: "POST",
          body: JSON.stringify(input),
        })) as TicketDetail,
      );
    } finally {
      setBusy(false);
    }
  }
  async function postEntry(event: FormEvent) {
    event.preventDefault();
    if (!detail || !canReply || (!body.trim() && !files.length)) return;
    const submittedVisibility = activeVisibility;
    if (submittedVisibility === "INTERNAL" && !canManage) {
      setReplyError(
        new Error(
          t(
            "İç not paylaşma yetkiniz yok.",
            "You do not have permission to post an internal note.",
          ),
        ),
      );
      return;
    }
    setBusy(true);
    setReplyError(null);
    try {
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          version: detail.ticket.version,
          body: body.trim(),
          visibility: submittedVisibility,
        }),
      );
      files.forEach((file) => form.append("files", file));
      applyDetail(
        (await authedFetch(path + "/entries", {
          method: "POST",
          body: form,
        })) as TicketDetail,
      );
      setDrafts((current) => ({
        ...current,
        [submittedVisibility]: { body: "", files: [] },
      }));
      setVisibility("PUBLIC");
    } catch (error) {
      setReplyError(error);
    } finally {
      setBusy(false);
    }
  }
  async function olderEntries() {
    if (!nextCursor || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(null);
    const currentRevision = revision.current;
    try {
      const page = (await authedFetch(
        path + "/entries?cursor=" + encodeURIComponent(nextCursor),
      )) as EntryPage;
      if (currentRevision !== revision.current) return;
      setEntries((current) => [
        ...page.items.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
        ...current,
      ]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (currentRevision === revision.current) setHistoryError(error);
    } finally {
      setHistoryLoading(false);
    }
  }
  const back = (
    <Link href="/it-support" className={d.back}>
      <ArrowLeft size={15} />
      {t("IT Destek'e dön", "Back to IT Support")}
    </Link>
  );
  if (denied)
    return (
      <div className={s.page}>
        {back}
        <div className={s.empty}>
          <ShieldAlert size={34} />
          <h1>{t("Erişim yetkisi gerekiyor", "Access required")}</h1>
          <p>
            {t(
              "IT Destek yalnızca aktif çalışan hesapları için kullanılabilir.",
              "IT Support is available to active employee accounts.",
            )}
          </p>
        </div>
      </div>
    );
  if (workspaceLoading || (workspace && loading && !detail))
    return (
      <div className={s.page}>
        {back}
        <div className={s.empty} role="status">
          <LoaderCircle size={28} className={d.spin} />
          <p>{t("Destek talebi yükleniyor…", "Loading support ticket…")}</p>
        </div>
      </div>
    );
  if (workspaceError || loadError || !detail || !workspace) {
    const error = workspaceError || loadError;
    const missing =
      error instanceof Error && /404|not found|bulunamadı/i.test(error.message);
    return (
      <div className={s.page}>
        {back}
        <div className={s.empty}>
          <Ticket size={34} />
          <h1>
            {missing
              ? t("Talep bulunamadı", "Ticket not found")
              : t("Talep yüklenemedi", "Could not load ticket")}
          </h1>
          <p role="alert" className={s.error}>
            {error
              ? errorText(error, locale)
              : t(
                  "Talep bilgilerine ulaşılamadı.",
                  "Ticket information is unavailable.",
                )}
          </p>
          <button
            type="button"
            className={s.secondary}
            onClick={() => {
              if (workspace) void load();
              else void reloadWorkspace();
            }}
          >
            <RotateCcw size={15} />
            {t("Tekrar dene", "Retry")}
          </button>
        </div>
      </div>
    );
  }

  const ticket = detail.ticket;
  // Do not rely on CSS to separate private notes from the requester's conversation.
  const visibleEntries = entries.filter(
    (entry) =>
      canManage || (entry.visibility === "PUBLIC" && entry.kind !== "NOTE"),
  );
  const visibleAttachments = [
    ...new Map(
      (canManage
        ? detail.attachments
        : visibleEntries.flatMap((entry) => entry.attachments)
      ).map((file) => [file.id, file]),
    ).values(),
  ] as Attachment[];
  const hasResolution = ["RESOLVED", "CLOSED"].includes(ticket.status);
  const actionLabel = (value: TicketAction) =>
    value === "CONFIRM"
      ? t("Çözümü onayla", "Confirm resolution")
      : value === "REOPEN"
        ? t("Yeniden aç", "Reopen")
        : t("Talebi iptal et", "Cancel ticket");
  const fieldNames: Record<string, string> = {
    status: t("Durum", "Status"),
    priority: t("Öncelik", "Priority"),
    category: t("Kategori", "Category"),
    assigneeId: t("IT sorumlusu", "IT assignee"),
    dueAt: t("Hedef tarih", "Target date"),
    resolution: t("Çözüm", "Resolution"),
    subject: t("Konu", "Subject"),
    description: t("Açıklama", "Description"),
    impact: t("Etkilenen kapsam", "Impact"),
    urgency: t("Aciliyet", "Urgency"),
  };
  function actionButton(value: TicketAction) {
    const Icon =
      value === "CONFIRM"
        ? CheckCircle2
        : value === "REOPEN"
          ? RotateCcw
          : XCircle;
    return (
      <button
        key={value}
        type="button"
        className={value === "CONFIRM" ? s.primary : s.secondary}
        disabled={busy || loading}
        onClick={() => setEditor(value)}
      >
        <Icon size={15} />
        {actionLabel(value)}
      </button>
    );
  }

  return (
    <div className={s.page}>
      {back}
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>
            DND · IT {t("DESTEK", "SUPPORT")} / {ticket.code}
          </div>
          <h1>{ticket.subject}</h1>
          <div className={s.badges}>
            <span
              className={s.badge}
              data-tone={
                ["RESOLVED", "CLOSED"].includes(ticket.status)
                  ? "green"
                  : ticket.status.startsWith("WAITING")
                    ? "amber"
                    : undefined
              }
            >
              {statusLabel(ticket.status, locale)}
            </span>
            <span className={s.badge}>{typeLabel(ticket.type, locale)}</span>
            <span className={s.badge}>
              {categoryLabel(ticket.category, locale)}
            </span>
            <span
              className={s.badge}
              data-tone={
                ticket.priority === "URGENT"
                  ? "red"
                  : ticket.priority === "HIGH"
                    ? "amber"
                    : undefined
              }
            >
              {priorityLabel(ticket.priority, locale)}
            </span>
            {isOverdue(ticket) && (
              <span className={s.badge} data-tone="red">
                {t("Planlanan hedef geçti", "Past planned target")}
              </span>
            )}
          </div>
          <div className={s.meta}>
            <span>{ticket.requester.name}</span>
            <span>{formatDateTime(ticket.createdAt, locale)}</span>
          </div>
        </div>
        <div className={s.actions}>
          {detail.actions
            .filter((value) => !hasResolution || value === "CANCEL")
            .map(actionButton)}
          {canManage && (
            <button
              type="button"
              className={s.primary}
              disabled={busy || loading}
              onClick={() => setEditor("triage")}
            >
              <Settings2 size={15} />
              {t("Talebi yönet", "Manage ticket")}
            </button>
          )}
        </div>
      </header>
      <div className={d.layout}>
        <div className={d.main}>
          {hasResolution && (
            <section className={d.resolution}>
              <h2>
                <CheckCircle2 size={19} />
                {ticket.status === "CLOSED"
                  ? t("Talep kapatıldı", "Ticket closed")
                  : t("Çözüm paylaşıldı", "Resolution shared")}
              </h2>
              <p className={d.prose}>
                {ticket.resolution ||
                  t(
                    "IT ekibi talebi çözüldü olarak işaretledi.",
                    "The IT team marked this ticket resolved.",
                  )}
              </p>
              {ticket.resolvedAt && (
                <p className={s.muted}>
                  {formatDateTime(ticket.resolvedAt, locale)}
                </p>
              )}
              <div className={s.actions}>
                {detail.actions
                  .filter((value) => value !== "CANCEL")
                  .map(actionButton)}
              </div>
            </section>
          )}
          <section className={s.panel}>
            <div className={s.panelHeader}>
              <h2>{t("Talep açıklaması", "Ticket description")}</h2>
            </div>
            <p className={d.prose}>{ticket.description}</p>
          </section>
          <section
            className={s.panel}
            aria-labelledby="ticket-conversation-heading"
          >
            <div className={s.panelHeader}>
              <div>
                <h2 id="ticket-conversation-heading">
                  {t("Yazışma ve gelişmeler", "Conversation and updates")}
                </h2>
                <p className={s.muted}>
                  {t(
                    "Talebi açan kişiyle IT ekibi arasındaki yazışma.",
                    "Conversation between the requester and the IT team.",
                  )}
                </p>
              </div>
              <MessageSquare size={21} />
            </div>
            {(!!nextCursor || historyError !== null) && (
              <div className={d.pagination}>
                {historyError !== null && (
                  <p className={s.error} role="alert">
                    {errorText(historyError, locale)}
                  </p>
                )}
                <button
                  type="button"
                  className={s.secondary}
                  disabled={!nextCursor || historyLoading || busy}
                  onClick={() => void olderEntries()}
                >
                  {historyLoading ? (
                    <LoaderCircle size={15} className={d.spin} />
                  ) : (
                    <History size={15} />
                  )}
                  {historyLoading
                    ? t("Yükleniyor…", "Loading…")
                    : t(
                        "Önceki yazışmaları yükle",
                        "Load earlier conversation",
                      )}
                </button>
              </div>
            )}
            {!visibleEntries.length ? (
              <div className={s.empty}>
                <MessageSquare size={28} />
                <p>{t("Henüz bir yanıt yok.", "No replies yet.")}</p>
              </div>
            ) : (
              <ol className={d.timeline}>
                {visibleEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className={d.entry}
                    data-internal={entry.visibility === "INTERNAL"}
                  >
                    <div className={d.entryHeader}>
                      <div className={d.author}>
                        <strong>{entry.authorName}</strong>
                        {entry.visibility === "INTERNAL" ? (
                          <span className={s.badge} data-tone="amber">
                            <LockKeyhole size={11} />
                            {t(
                              "İç not · yalnızca IT",
                              "Internal note · IT only",
                            )}
                          </span>
                        ) : (
                          <span className={d.entryType}>
                            {entry.kind === "CREATED"
                              ? t("Talep oluşturuldu", "Ticket created")
                              : entry.kind === "STATUS"
                                ? t("Durum değişikliği", "Status change")
                                : entry.kind === "UPDATED"
                                  ? t("Talep güncellendi", "Ticket updated")
                                  : t("Yanıt", "Reply")}
                          </span>
                        )}
                      </div>
                      <time dateTime={entry.createdAt}>
                        {formatDateTime(entry.createdAt, locale)}
                      </time>
                    </div>
                    {entry.status && (
                      <span className={s.badge}>
                        {statusLabel(entry.status, locale)}
                      </span>
                    )}
                    {entry.changedFields.length > 0 && (
                      <div className={d.entryFields}>
                        {[
                          ...new Set(
                            entry.changedFields.map(
                              (field) =>
                                fieldNames[field] ||
                                t("Talep bilgisi", "Ticket information"),
                            ),
                          ),
                        ].join(" · ")}
                      </div>
                    )}
                    {entry.body && <p className={d.entryBody}>{entry.body}</p>}
                    {entry.attachments.length > 0 && (
                      <Attachments files={entry.attachments} locale={locale} />
                    )}
                  </li>
                ))}
              </ol>
            )}
            {detail.canReply ? (
              <form
                className={d.composer}
                data-internal={activeVisibility === "INTERNAL"}
                onSubmit={postEntry}
              >
                {canManage && (
                  <fieldset className={d.visibility} disabled={!canReply}>
                    <legend>
                      {t("Mesaj görünürlüğü", "Message visibility")}
                    </legend>
                    <label>
                      <input
                        type="radio"
                        name="reply-visibility"
                        value="PUBLIC"
                        checked={activeVisibility === "PUBLIC"}
                        onChange={() => setVisibility("PUBLIC")}
                      />
                      {t("Talep sahibine yanıt", "Reply to requester")}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="reply-visibility"
                        value="INTERNAL"
                        checked={activeVisibility === "INTERNAL"}
                        onChange={() => setVisibility("INTERNAL")}
                      />
                      <LockKeyhole size={13} />
                      {t("İç not · yalnızca IT", "Internal note · IT only")}
                    </label>
                  </fieldset>
                )}
                <label className={s.field}>
                  {activeVisibility === "INTERNAL"
                    ? t("İç not", "Internal note")
                    : t("Yanıtınız", "Your reply")}
                  <textarea
                    aria-label={
                      activeVisibility === "INTERNAL"
                        ? t("İç not", "Internal note")
                        : t("Yanıtınız", "Your reply")
                    }
                    rows={5}
                    maxLength={5000}
                    disabled={!canReply}
                    value={body}
                    onChange={(event) =>
                      updateDraft({ body: event.target.value })
                    }
                    placeholder={
                      activeVisibility === "INTERNAL"
                        ? t(
                            "Bu notu ve eklerini talebi açan kişi göremez.",
                            "The requester cannot see this note or its attachments.",
                          )
                        : t(
                            "Gelişmeleri, istenen bilgileri veya sorunun devam edip etmediğini paylaşın.",
                            "Share updates, requested information or whether the issue persists.",
                          )
                    }
                  />
                </label>
                <FilePicker
                  files={files}
                  onChange={(nextFiles) => updateDraft({ files: nextFiles })}
                  locale={locale}
                  disabled={!canReply}
                />
                {replyError !== null && (
                  <p className={s.error} role="alert">
                    {errorText(replyError, locale)}
                  </p>
                )}
                <div className={d.composerFooter}>
                  <small>
                    {activeVisibility === "INTERNAL"
                      ? t(
                          "Yalnızca IT yöneticileri görür; ekler de gizlidir.",
                          "Visible only to IT administrators; attachments are private too.",
                        )
                      : t(
                          "Yanıt ve ekler talebi açan kişiyle IT ekibi tarafından görülür.",
                          "The requester and IT team can see this reply and its attachments.",
                        )}
                  </small>
                  <button
                    type="submit"
                    className={s.primary}
                    disabled={!canReply || (!body.trim() && !files.length)}
                  >
                    {busy ? (
                      <LoaderCircle size={15} className={d.spin} />
                    ) : activeVisibility === "INTERNAL" ? (
                      <LockKeyhole size={15} />
                    ) : (
                      <Send size={15} />
                    )}
                    {busy
                      ? t("Gönderiliyor…", "Sending…")
                      : activeVisibility === "INTERNAL"
                        ? t("İç not ekle", "Add internal note")
                        : t("Yanıt gönder", "Send reply")}
                  </button>
                </div>
              </form>
            ) : (
              <p className={s.notice}>
                {t(
                  "Bu talepte yeni mesaj paylaşımı kapalı. Uygun işlemleri yukarıdaki düğmelerden seçebilirsiniz.",
                  "New messages are disabled for this ticket. Available actions are shown above.",
                )}
              </p>
            )}
          </section>
        </div>
        <aside
          className={d.aside}
          aria-label={t("Talep bilgileri", "Ticket information")}
        >
          <section className={s.panel}>
            <div className={s.panelHeader}>
              <h2>{t("Takip bilgileri", "Tracking")}</h2>
              <Clock3 size={19} />
            </div>
            <dl className={d.facts}>
              <div>
                <dt>{t("Talebi açan", "Requester")}</dt>
                <dd>{ticket.requester.name}</dd>
              </div>
              <div>
                <dt>{t("IT sorumlusu", "IT assignee")}</dt>
                <dd>
                  {ticket.assignee?.name || t("Henüz atanmadı", "Unassigned")}
                </dd>
              </div>
              <div>
                <dt>{t("Planlanan hedef", "Planned target")}</dt>
                <dd className={isOverdue(ticket) ? d.warning : undefined}>
                  {ticket.dueAt
                    ? formatDateTime(ticket.dueAt, locale)
                    : t("Henüz belirlenmedi", "Not set yet")}
                </dd>
              </div>
              <div>
                <dt>{t("Son güncelleme", "Last updated")}</dt>
                <dd>{formatDateTime(ticket.updatedAt, locale)}</dd>
              </div>
              {ticket.firstResponseAt && (
                <div>
                  <dt>{t("İlk IT yanıtı", "First IT response")}</dt>
                  <dd>{formatDateTime(ticket.firstResponseAt, locale)}</dd>
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <dt>{t("Kapatılma", "Closed")}</dt>
                  <dd>{formatDateTime(ticket.closedAt, locale)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className={s.panel}>
            <div className={s.panelHeader}>
              <h2>{t("İhtiyaç ve etki", "Request and impact")}</h2>
              <CircleHelp size={19} />
            </div>
            <dl className={d.facts}>
              <div>
                <dt>{t("İlgili sistem / cihaz", "System / device")}</dt>
                <dd>{ticket.system || t("Belirtilmedi", "Not specified")}</dd>
              </div>
              <div>
                <dt>{t("Konum", "Location")}</dt>
                <dd>{ticket.location || t("Belirtilmedi", "Not specified")}</dd>
              </div>
              <div className={d.factPair}>
                <div>
                  <dt>{t("Etkilenen kapsam", "Impact")}</dt>
                  <dd>{impactLabel(ticket.impact, locale)}</dd>
                </div>
                <div>
                  <dt>{t("Bildirilen aciliyet", "Reported urgency")}</dt>
                  <dd>{urgencyLabel(ticket.urgency, locale)}</dd>
                </div>
              </div>
            </dl>
            <p className={s.muted}>
              {t(
                "Bildirilen etki ve aciliyet, IT ekibinin önceliklendirmesine yardımcı olur.",
                "Reported impact and urgency help the IT team prioritize the request.",
              )}
            </p>
          </section>
          {visibleAttachments.length > 0 && (
            <section className={s.panel}>
              <details className={d.attachments}>
                <summary>
                  {t("Yazışmadaki ekler", "Conversation attachments")} (
                  {visibleAttachments.length})
                </summary>
                <div>
                  <Attachments files={visibleAttachments} locale={locale} />
                  {!canManage && nextCursor && (
                    <p className={s.muted}>
                      {t(
                        "Daha eski ekler için önceki yazışmaları yükleyin.",
                        "Load earlier conversation to view older attachments.",
                      )}
                    </p>
                  )}
                </div>
              </details>
            </section>
          )}
        </aside>
      </div>
      {editor === "triage" && canManage && (
        <TriageForm
          ticket={ticket}
          agents={workspace.agents}
          allowedStatuses={detail.allowedStatuses}
          locale={locale}
          onClose={() => setEditor(null)}
          onSubmit={triage}
        />
      )}
      {editor && editor !== "triage" && detail.actions.includes(editor) && (
        <TicketActionForm
          action={editor}
          ticket={ticket}
          locale={locale}
          onClose={() => setEditor(null)}
          onSubmit={action}
        />
      )}
    </div>
  );
}
