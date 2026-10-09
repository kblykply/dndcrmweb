"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Followup = { id: string; fullName: string; phone: string; status: string; nextFollowUpAt: string | null };

export default function FollowupsPage() {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const [range, setRange] = useState("today");
  const [items, setItems] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setItems([]);
    void authedFetch(`/leads/followups?range=${range}`, { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setItems(Array.isArray(rows) ? rows : []); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, version]);
  return <main className="page">
    <div className="page-header"><div><h1>{tr ? "Arama Takipleri" : "Call Follow-ups"}</h1><p>{tr ? "Yetkiniz kapsamındaki leadlerin planlanan aramaları." : "Scheduled calls for leads within your access."}</p></div><button className="btn" onClick={() => setVersion(value => value + 1)} disabled={loading}>{tr ? "Yenile" : "Refresh"}</button></div>
    <div className="card">
      <label>{tr ? "Takip dönemi" : "Follow-up period"}{" "}<select value={range} onChange={event => setRange(event.target.value)}>
        <option value="today">{tr ? "Bugün" : "Today"}</option><option value="overdue">{tr ? "Geciken" : "Overdue"}</option><option value="week">{tr ? "Önümüzdeki 7 gün" : "Next 7 days"}</option><option value="missing">{tr ? "Takip tarihi olmayan" : "No follow-up scheduled"}</option>
      </select></label>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">{tr ? "Yükleniyor…" : "Loading…"}</p> : !error && <>
        {!items.length ? <p>{tr ? "Bu dönemde erişiminize açık arama takibi yok." : "No accessible follow-ups for this period."}</p> : <div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>{tr ? "Lead" : "Lead"}</th><th>{tr ? "Telefon" : "Phone"}</th><th>{tr ? "Durum" : "Status"}</th><th>{tr ? "Takip tarihi" : "Follow-up date"}</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><Link href={`/leads/${item.id}`}>{item.fullName}</Link></td><td><a href={`tel:${item.phone}`}>{item.phone}</a></td><td>{item.status}</td><td>{item.nextFollowUpAt ? new Date(item.nextFollowUpAt).toLocaleString(tr ? "tr-TR" : "en-GB", {timeZone:"Asia/Famagusta"}) : "—"}</td></tr>)}</tbody></table></div>}
      </>}
    </div>
  </main>;
}
