"use client";
import { useEffect, useRef, useState } from "react";
import { CloudDownload } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import s from "../payment-tracking.module.css";

type SyncState = {
  workerOnline: boolean;
  source: { id: string; importedAt: string } | null;
  job: { id: string; status: string; stage: string; recordCount: number | null; errorCode: string | null } | null;
};
export default function FinanceSyncButton({ tr, onUpdated, displayedImport }: { tr: boolean; onUpdated: () => void; displayedImport?: string | null }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const callback = useRef(onUpdated);
  const batch = useRef<string | null | undefined>(undefined);
  const refreshedBatch = useRef<string | null>(null);
  const mounted = useRef(true);
  const requestNo = useRef(0);
  callback.current = onUpdated;
  const displayed = useRef(displayedImport);
  displayed.current = displayedImport;
  const active = ['QUEUED', 'RUNNING'].includes(state?.job?.status || '');
  const accept = (data: SyncState) => {
    if (!mounted.current) return;
    setState(data); setError(false);
    const outdated = displayed.current && data.source &&
      Date.parse(displayed.current) !== Date.parse(data.source.importedAt);
    const changedWhileUnavailable = !displayed.current && batch.current !== undefined && batch.current !== data.source?.id;
    if ((outdated || changedWhileUnavailable) && data.source?.id && refreshedBatch.current !== data.source.id) {
      refreshedBatch.current = data.source.id;
      callback.current();
    }
    batch.current = data.source?.id ?? null;
  };
  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isVisible = () => document.visibilityState === 'visible';
    async function poll() {
      if (stopped || busy || !isVisible()) return;
      busy = true;
      const ticket = ++requestNo.current;
      try { const data = await authedFetch('/finance-sync'); if (!stopped && ticket === requestNo.current) accept(data); }
      catch { if (!stopped && ticket === requestNo.current) setError(true); }
      finally {
        busy = false;
        if (!stopped && isVisible()) timer = setTimeout(poll, active ? 5000 : 30000);
      }
    }
    const visible = () => { clearTimeout(timer); if (isVisible()) void poll(); };
    document.addEventListener('visibilitychange', visible);
    void poll();
    return () => { stopped = true; mounted.current = false; clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
    // Callback refs stay current without restarting polling on ordinary table renders.
  }, [active, displayedImport]);
  async function start() {
    if (sending) return;
    setSending(true);
    const ticket = ++requestNo.current;
    try { const data = await authedFetch('/finance-sync', { method: 'POST' }); if (ticket === requestNo.current) accept(data); }
    catch { if (mounted.current) setError(true); }
    finally { if (mounted.current) setSending(false); }
  }
  const stages: Record<string, string> = tr
    ? { QUEUED: 'Güncelleme sırada', READING: 'Logo’dan okunuyor', VALIDATING: 'Veriler kontrol ediliyor', SAVING: 'Kaydediliyor' }
    : { QUEUED: 'Update queued', READING: 'Reading Logo', VALIDATING: 'Checking data', SAVING: 'Saving' };
  let message = '';
  if (error) message = tr ? 'Güncelleme durumu alınamadı.' : 'Update status unavailable.';
  else if (active) message = stages[state?.job?.stage || ''] || (tr ? 'Güncelleniyor' : 'Updating');
  else if (state?.job?.status === 'FAILED') message = state.job.errorCode === 'SOURCE_DROP_REVIEW'
    ? (tr ? 'Kaynakta büyük azalma var; kontrol gerekiyor. Önceki veriler korundu.' : 'Source count dropped significantly; review required. Previous data retained.')
    : state.job.errorCode === 'SOURCE_ATTRIBUTES_UNMATCHED'
    ? (tr ? 'Logo ödeme ve fatura kayıtları eşleşmiyor. Finans kontrolü gerekiyor; önceki veriler korundu.' : 'Logo payment and invoice records do not match. Finance review required; previous data retained.')
    : state.job.errorCode === 'SOURCE_ATTRIBUTES_UNAVAILABLE'
    ? (tr ? 'Logo fatura bilgileri okunamadı. Önceki veriler korundu.' : 'Logo invoice details could not be read. Previous data retained.')
    : state.job.errorCode === 'SOURCE_CLOSURE_UNAVAILABLE'
    ? (tr ? 'Kapatılmamış alacak bilgileri doğrulanamadı. Önceki veriler korundu.' : 'Unallocated credit data could not be verified. Previous data retained.')
    : (tr ? 'Güncelleme tamamlanamadı. Önceki veriler korundu.' : 'Update failed. Previous data retained.');
  else if (state?.job?.status === 'SUCCEEDED') message = tr ? 'Güncelleme tamamlandı' : 'Update completed';
  if (!error && state && !state.workerOnline) message += (message ? ' · ' : '') + (tr ? 'Aktarım servisi bağlantısı bekleniyor' : 'Waiting for transfer service');
  return <div style={{ display: 'grid', gap: 4, maxWidth: 300 }}>
    <button type="button" className={s.button} onClick={() => void start()} disabled={sending || active || !state || error}>
      <CloudDownload size={20} aria-hidden="true" />
      {sending || active ? (tr ? 'Güncelleniyor…' : 'Updating…') : (tr ? 'Logo verilerini güncelle' : 'Update Logo data')}
    </button>
    {state?.source && <small> {tr ? 'Son aktarım: ' : 'Last transfer: '}{new Date(state.source.importedAt).toLocaleString(tr ? 'tr-TR' : 'en-GB', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small>}
    {message && <small role="status" aria-live="polite">{message}</small>}
  </div>;
}
