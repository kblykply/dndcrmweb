"use client";
/* Authenticated blob URLs are displayed directly. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Globe2, ImageIcon, X } from "lucide-react";
import type { MapNode } from "../_lib/types";
import { safeWebUrl } from "../_lib/media";
import s from "../digital-map.module.css";

export default function AssetPreview({ node, imageUrl, tr, onClose }: { node: MapNode; imageUrl?: string; tr: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [live, setLive] = useState(false);
  const url = safeWebUrl(node.url);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog className={s.previewDialog} ref={dialog} aria-label={node.name} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><div><span>{tr ? "SİSTEM ÖNİZLEMESİ" : "SYSTEM PREVIEW"}</span><h2>{node.name}</h2></div><button type="button" className={s.iconButton} aria-label={tr ? "Önizlemeyi kapat" : "Close preview"} onClick={onClose}><X size={19} /></button></header>
    <div className={s.previewToolbar}><button className={s.button} aria-pressed={!live} onClick={() => setLive(false)}><ImageIcon size={15} />{tr ? "Yüklenen görsel" : "Uploaded image"}</button><button className={s.button} disabled={!url} aria-pressed={live} onClick={() => setLive(true)}><Globe2 size={15} />{tr ? "Canlı sayfa" : "Live page"}</button>{url && <a className={s.button} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />{tr ? "Yeni sekmede aç" : "Open in new tab"}</a>}</div>
    {live && url ? <><p className={s.previewNotice}>{tr ? "Bazı siteler bu görünümde açılmayabilir. Gerekirse yeni sekmede açın; özel ağ adresleri için ofis ağı veya Tailscale bağlantınız gerekir." : "Some sites cannot open in this view. Use a new tab if needed; private addresses require your office network or Tailscale connection."}</p><iframe title={node.name} src={url} className={s.liveFrame} referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" /></> : imageUrl ? <div className={s.previewImage}><img src={imageUrl} alt={node.name} /></div> : <div className={s.empty}><ImageIcon size={36} /><p>{tr ? "Henüz görsel eklenmedi. Öğe ayrıntılarından ekran görüntüsü yükleyebilirsiniz." : "No image yet. Upload a screenshot in item details."}</p></div>}
  </dialog>;
}
