"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, X } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import styles from "./tracking.module.css";

type Language = "tr" | "fa" | "ru" | "en";
type Recipient = { deliveryLanguage?: string | null; status: string };
type Preview = { subject: string; html: string; source: "queued" | "sent-record"; customerName: string; unitNumbers: string };
const LANGUAGES: Language[] = ["tr", "fa", "ru", "en"];
// Approved local Perla campaign plan: 100 messages/hour, 36 seconds apart.
const PLANNED_INTERVAL_SECONDS = 36;

export default function DeliveryLanguagePlan({ campaignId, recipients, paused, tr }: {
  campaignId: string; recipients: Recipient[]; paused: boolean; tr: boolean;
}) {
  const [language, setLanguage] = useState<Language | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const groups = useMemo(() => {
    const counts = LANGUAGES.map(lang => {
      const rows = recipients.filter(row => row.deliveryLanguage === lang && !["MISSING_EMAIL", "SKIPPED"].includes(row.status));
      const sent = rows.filter(row => row.status === "SENT").length;
      const pending = rows.filter(row => ["QUEUED", "SENDING"].includes(row.status)).length;
      const seconds = pending * PLANNED_INTERVAL_SECONDS;
      return { language: lang, total: rows.length, sent, pending, seconds, minutes: Math.ceil(seconds / 60), review: rows.length - sent - pending };
    }).filter(group => group.total > 0);
    return counts.map((group, index) => {
      const offset = counts.slice(0, index).reduce((sum, previous) => sum + previous.seconds, 0);
      return { ...group, start: Math.ceil(offset / 60), end: Math.ceil((offset + group.seconds) / 60) };
    });
  }, [recipients]);
  const next = groups.find(group => group.pending > 0)?.language;
  const label = (lang: Language) => ({ tr: tr ? "Türkçe" : "Turkish", fa: tr ? "Farsça" : "Persian", ru: tr ? "Rusça" : "Russian", en: tr ? "İngilizce" : "English" })[lang];

  useEffect(() => {
    if (!language) return;
    let active = true;
    dialog.current?.showModal();
    void authedFetch(`/bulk-email/campaigns/${encodeURIComponent(campaignId)}/preview/${language}`)
      .then((data: Preview) => { if (active) setPreview(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [campaignId, language]);

  function closePreview() { dialog.current?.close(); setLanguage(null); setPreview(null); setFailed(false); }

  return <>
    <section className={styles.plan} aria-label={tr ? "Dil grupları ve gönderim planı" : "Language groups and delivery plan"}>
      <div className={styles.planHeading}><h2>{tr ? "Gönderim sırası" : "Delivery order"}</h2><span>{tr ? "Plan: 100 mail/saat" : "Plan: 100 emails/hour"}</span></div>
      <ol className={styles.planRows}>{groups.map((group, index) => <li key={group.language} className={group.language === next ? styles.nextGroup : ""}>
        <span className={styles.sequence}>{index + 1}</span>
        <div className={styles.groupName}><strong>{label(group.language)}</strong><span>{group.total} {tr ? "alıcı" : "recipients"}{group.language === next ? ` · ${paused ? (tr ? "İlk sırada" : "Up next") : (tr ? "Sıradaki grup" : "Next group")}` : ""}</span></div>
        <div className={styles.groupCounts}><strong>{group.sent} {tr ? "gönderildi" : "sent"}</strong><span>{group.pending} {tr ? "sırada" : "queued"}{group.review ? ` · ${group.review} ${tr ? "kontrol gerekli" : "need review"}` : ""}</span></div>
        <div className={styles.groupTiming}>{group.pending ? <><strong>~{group.minutes} {tr ? "dk" : "min"}</strong><span>{group.start}–{group.end}. {tr ? "dakika" : "minute"}</span></> : <strong>{group.review ? (tr ? "Kontrol gerekli" : "Needs review") : (tr ? "Tamamlandı" : "Completed")}</strong>}</div>
        <button type="button" className={styles.previewButton} aria-label={`${label(group.language)} ${tr ? "mail önizlemesi" : "email preview"}`} onClick={() => { setPreview(null); setFailed(false); setLanguage(group.language); }}><Eye size={19} /><span>{tr ? "Maili gör" : "Preview"}</span></button>
      </li>)}</ol>
      <p className={styles.planNote}>{tr ? `${paused ? "Devam ettirildikten sonra" : "Şu andan itibaren"} kalan gönderimler için tahmini süreler; bekleme ve yeniden denemeler süreyi uzatabilir.` : `Estimates for remaining deliveries ${paused ? "after resuming" : "from now"}; pauses and retries may extend the schedule.`}</p>
    </section>
    <dialog ref={dialog} className={styles.previewDialog} onCancel={closePreview} onClose={() => { setLanguage(null); setPreview(null); setFailed(false); }} aria-labelledby="mail-preview-title">
      <div className={styles.previewHeader}><h2 id="mail-preview-title">{language ? label(language) : ""} · {tr ? "Mail önizlemesi" : "Email preview"}</h2><button type="button" className={styles.iconButton} aria-label={tr ? "Önizlemeyi kapat" : "Close preview"} onClick={closePreview}><X size={22} /></button></div>
      {failed ? <p className={styles.empty}>{tr ? "Kayıtlı mail içeriği alınamadı. Önizlemeyi kapatıp tekrar deneyin." : "Saved email content could not be loaded. Close and try again."}</p> : !preview ? <p className={styles.empty}>{tr ? "Mail yükleniyor…" : "Loading email…"}</p> : <>
        <div className={styles.previewMeta}><strong>{preview.subject}</strong><span>{preview.customerName} · {preview.unitNumbers}</span><small>{preview.source === "queued" ? (tr ? "Bu grupta sıradaki mail. Konu başlığı her alıcının dairesine göre değişir." : "The next email in this group. The subject varies by recipient’s unit.") : (tr ? "Gönderilen mailin kayıtlı metni." : "Saved text of a sent email.")}</small></div>
        <iframe className={styles.previewFrame} title={tr ? "Mail içeriği" : "Email content"} sandbox="" referrerPolicy="no-referrer" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';">${preview.html}`} />
      </>}
    </dialog>
  </>;
}
