"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Mail, RefreshCw, Search, Users, X } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { projectLabel } from "@/lib/projects";
import styles from "./tracking.module.css";
import DeliveryLanguagePlan from "./DeliveryLanguagePlan";

type Status = "SENT" | "QUEUED" | "SENDING" | "FAILED" | "UNCERTAIN" | "MISSING_EMAIL" | "SKIPPED";
type Recipient = {
  id: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  unitNumbers: string;
  unitSnapshot?: Array<{ id: string; unitNumber: string }> | null;
  subject?: string | null;
  deliveryLanguage?: string | null;
  status: Status;
  sentAt?: string | null;
  error?: string | null;
};
type Campaign = {
  id: string;
  name: string;
  project: string;
  subject: string;
  status: string;
  pausedAt?: string | null;
  createdAt: string;
};
type Detail = Campaign & { recipients: Recipient[] };
type Group = "all" | "sent" | "pending" | "attention";
const groupOf = (status: Status): Group => status === "SENT" ? "sent" : ["QUEUED", "SENDING"].includes(status) ? "pending" : "attention";
const order: Record<Status, number> = { SENT: 0, SENDING: 1, QUEUED: 2, FAILED: 3, UNCERTAIN: 4, MISSING_EMAIL: 5, SKIPPED: 6 };

export default function BulkEmailPage() {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<Group>("all");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const project = params.get("project");
    async function load() {
      try {
        const data: Campaign[] = await authedFetch(`/bulk-email/campaigns${project ? `?project=${encodeURIComponent(project)}` : ""}`);
        if (!active) return;
        setCampaigns(data);
        setSelected(previous => previous || params.get("campaign") || data.find(c => c.status === "SENDING")?.id || data[0]?.id || "");
        if (!data.length && !params.get("campaign")) setLoading(false);
        setError(false);
      } catch { if (active) { setError(true); setLoading(false); } }
    }
    void load();
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    let busy = false;
    async function load() {
      if (busy) return;
      busy = true;
      try {
        const data: Detail = await authedFetch(`/bulk-email/campaigns/${encodeURIComponent(selected)}`);
        if (active) { setDetail(data); setUpdated(new Date()); setError(false); }
      } catch { if (active) setError(true); }
      finally { busy = false; if (active) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 10000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [selected, refresh]);

  const counts = useMemo(() => {
    const result = { sent: 0, pending: 0, attention: 0, missing: 0, skipped: 0, failed: 0 };
    for (const row of detail?.recipients || []) {
      const category = groupOf(row.status);
      if (category !== "all") result[category]++;
      if (row.status === "MISSING_EMAIL") result.missing++;
      if (row.status === "SKIPPED") result.skipped++;
      if (["FAILED", "UNCERTAIN"].includes(row.status)) result.failed++;
    }
    return result;
  }, [detail]);
  const total = counts.sent + counts.pending + counts.failed;
  const percent = total ? Math.round(counts.sent / total * 100) : 0;
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    return (detail?.recipients || []).filter(row =>
      (group === "all" || groupOf(row.status) === group) &&
      (!query || [row.customerName, row.email, row.phone, row.unitNumbers, row.subject].join(" ").toLocaleLowerCase(locale).includes(query)),
    ).sort((a, b) => order[a.status] - order[b.status] ||
      (a.status === "SENT" ? (b.sentAt || "").localeCompare(a.sentAt || "") : 0) ||
      a.unitNumbers.localeCompare(b.unitNumbers, locale, { numeric: true }));
  }, [detail, group, search, locale]);

  const statusText = (status: Status) => ({
    SENT: tr ? "Gönderildi" : "Sent",
    QUEUED: tr ? "Sırada" : "Queued",
    SENDING: tr ? "Gönderiliyor" : "Sending",
    FAILED: tr ? "Gönderilemedi" : "Failed",
    UNCERTAIN: tr ? "Kontrol gerekli" : "Needs review",
    MISSING_EMAIL: tr ? "E-posta yok" : "No email",
    SKIPPED: tr ? "Gönderilmedi" : "Skipped",
  })[status];
  const languageText = (language?: string | null) => ({ tr: tr ? "Türkçe" : "Turkish", en: tr ? "İngilizce" : "English", ru: tr ? "Rusça" : "Russian", fa: tr ? "Farsça" : "Persian" })[language as "tr" | "en" | "ru" | "fa"] || "—";
  const dateText = (date?: string | null) => date ? new Date(date).toLocaleString(tr ? "tr-TR" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }) : "—";
  const phase = detail?.pausedAt ? (tr ? "Gönderim duraklatıldı" : "Delivery paused")
    : detail?.status === "SENDING" ? (tr ? "Gönderim devam ediyor" : "Delivery in progress")
    : counts.failed ? (tr ? "Tamamlandı · Kontrol gerekli" : "Finished · Needs review")
    : (tr ? "Gönderim tamamlandı" : "Delivery complete");
  const cards = [
    { key: "sent" as const, label: tr ? "Gönderildi" : "Sent", icon: Check },
    { key: "pending" as const, label: tr ? "Sırada" : "Queued", icon: Clock3 },
    { key: "attention" as const, label: tr ? "İletişim / kontrol gerekli" : "Contact / review needed", icon: Users },
  ];

  function selectCampaign(id: string) {
    setSelected(id); setDetail(null); setLoading(true); setGroup("all"); setSearch(""); setUpdated(null);
    const url = new URL(window.location.href);
    url.searchParams.set("campaign", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className={styles.page} id="delivery-process">
      <header className={styles.header}>
        <div><h1>{tr ? "Mail Gönderim Takibi" : "Email Delivery Tracking"}</h1><p>{detail ? projectLabel(detail.project) : ""}</p></div>
        <div className={styles.actions}>
          {campaigns.length > 1 && <select aria-label={tr ? "Gönderim seç" : "Select campaign"} value={selected} onChange={event => selectCampaign(event.target.value)}>
            {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name} · {new Date(campaign.createdAt).toLocaleDateString(tr ? "tr-TR" : "en-GB")}</option>)}
          </select>}
          <button type="button" className={styles.iconButton} onClick={() => setRefresh(value => value + 1)} aria-label={tr ? "Yenile" : "Refresh"} title={tr ? "Yenile" : "Refresh"}><RefreshCw size={22} /></button>
        </div>
      </header>

      {error && <div className={styles.error} role="alert">{tr ? "Güncel durum alınamadı. Bağlantıyı kontrol edip yenileyin." : "Could not refresh the status. Check your connection and refresh."}</div>}
      {loading && !detail && <div className={styles.empty}>{tr ? "Gönderim bilgileri yükleniyor…" : "Loading delivery status…"}</div>}
      {!loading && !detail && !error && <div className={styles.empty}><Mail size={32} /><p>{tr ? "Henüz gönderim kaydı yok." : "No campaigns yet."}</p></div>}

      {detail && <>
        <section className={styles.summary} aria-label={tr ? "Gönderim ilerlemesi" : "Delivery progress"}>
          <div className={styles.progressHeading}><strong><span className={`${styles.dot} ${detail.pausedAt ? styles.paused : ""}`} />{phase}</strong><span>{counts.sent} / {total} {tr ? "mail" : "emails"} · %{percent}</span></div>
          <progress className={styles.progress} value={counts.sent} max={total || 1} aria-label={tr ? "Gönderilen mail oranı" : "Sent emails"} />
          <div className={styles.cards}>{cards.map(({ key, label, icon: Icon }) =>
            <button type="button" key={key} className={`${styles.card} ${group === key ? styles.selectedCard : ""}`} aria-pressed={group === key} onClick={() => setGroup(previous => previous === key ? "all" : key)}>
              <span><Icon size={21} />{label}</span><strong>{counts[key]}</strong>
              {key === "attention" && <small>{[counts.missing ? `${counts.missing} ${tr ? "e-posta yok" : "no email"}` : "", counts.skipped ? `${counts.skipped} ${tr ? "gönderilmedi" : "skipped"}` : "", counts.failed ? `${counts.failed} ${tr ? "hata / kontrol" : "errors / review"}` : ""].filter(Boolean).join(" · ") || (tr ? "Kontrol gereken kayıt yok" : "No issues")}</small>}
            </button>,
          )}</div>
          <footer className={styles.summaryFooter}><span>{tr ? "Gönderildi: mail sunucusu kabul etti." : "Sent: accepted by the mail server."}</span><span>{tr ? "Otomatik güncellenir" : "Updates automatically"}{updated ? ` · ${updated.toLocaleTimeString(tr ? "tr-TR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}</span></footer>
        </section>

        {detail.project === "LA_JOYA_PERLA" && <DeliveryLanguagePlan key={detail.id} campaignId={detail.id} recipients={detail.recipients} paused={Boolean(detail.pausedAt)} tr={tr} />}

        <section className={styles.list}>
          <div className={styles.listHeader}>
            <div><h2>{group === "all" ? (tr ? "Alıcılar" : "Recipients") : cards.find(card => card.key === group)?.label} <span>{rows.length}</span></h2>{group !== "all" && <button className={styles.textButton} onClick={() => setGroup("all")}>{tr ? "Tümünü göster" : "Show all"}</button>}</div>
            <div className={styles.actions}>{searchOpen && <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder={tr ? "İsim, daire, e-posta…" : "Name, unit, email…"} aria-label={tr ? "Alıcı ara" : "Search recipients"} />}
              <button className={styles.iconButton} aria-label={searchOpen ? (tr ? "Aramayı kapat" : "Close search") : (tr ? "Ara" : "Search")} title={tr ? "Ara" : "Search"} aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setSearch(""); }}>{searchOpen ? <X size={22} /> : <Search size={22} />}</button>
            </div>
          </div>
          <div className={styles.tableScroll}>
            <table><thead><tr><th>{tr ? "Alıcı" : "Recipient"}</th><th>{tr ? "Daire" : "Unit"}</th><th>{tr ? "Mail konusu" : "Subject"}</th><th>{tr ? "Dil" : "Language"}</th><th>{tr ? "Durum" : "Status"}</th><th>{tr ? "Gönderim zamanı" : "Sent at"}</th></tr></thead>
              <tbody>{rows.map(row => <tr key={row.id}>
                <td><strong>{row.customerName}</strong><span className={styles.secondary}>{row.email || row.phone || "—"}</span></td>
                <td className={styles.units}>{Array.isArray(row.unitSnapshot) && row.unitSnapshot.length ? row.unitSnapshot.map(unit => <Link key={unit.id} href={`/units/${encodeURIComponent(unit.id)}`}>{unit.unitNumber}</Link>) : row.unitNumbers || "—"}</td>
                <td className={styles.subject}>{row.subject || (groupOf(row.status) !== "attention" ? detail.subject : "—")}</td>
                <td>{languageText(row.deliveryLanguage)}</td>
                <td><span className={`${styles.badge} ${styles[groupOf(row.status)]}`}>{statusText(row.status)}</span>{row.error && <details className={styles.reason}><summary>{tr ? "Neden?" : "Reason"}</summary><p>{row.error}</p></details>}</td>
                <td className={styles.date}>{dateText(row.sentAt)}</td>
              </tr>)}{!rows.length && <tr><td colSpan={6} className={styles.empty}>{tr ? "Eşleşen alıcı yok." : "No matching recipients."}</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </>}
    </main>
  );
}
