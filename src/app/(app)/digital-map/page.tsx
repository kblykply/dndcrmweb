"use client";
/* Private screenshots use authenticated blob URLs, which do not use the image optimizer. */
/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Box, Check, ChevronRight, CircleHelp, Cloud, Database, ExternalLink, ImageIcon, Maximize2, PanelTop, Upload, Workflow, ArrowLeftRight, Download, Globe2, Layers3, Link2, List, LoaderCircle, Monitor, Network, Plus, Redo2, Save, Search, Server, Settings2, ShieldCheck, Terminal, Trash2, Undo2, Users, X, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { absolutePosition, accessRoutes, CONTAINER_HEADER, CONTAINER_PADDING, canContain, createEdge, createNode, descendants, normalizeDocument, removeNode, reparentNode } from "./_lib/model";
import { getSystems } from "./_lib/systems";
import { safeWebUrl } from "./_lib/media";
import { useMapImages } from "./_lib/useMapImages";
import AssetPreview from "./_components/AssetPreview";
import { edgeLabel, environmentLabel, kindLabel, statusLabel } from "./_lib/copy";
import { edgeKinds, nodeKinds, type MapDocument, type MapEdge, type MapNode, type MapSelection, type MapWorkspace, type NodeKind, type MapLayer, type MapViewMode, type MapImage } from "./_lib/types";
import s from "./digital-map.module.css";

const Canvas = dynamic(() => import("./_components/DigitalMapCanvas"), { ssr: false, loading: () => <div className={s.loading}><LoaderCircle size={22} /></div> });
const icons: Record<NodeKind, LucideIcon> = { SERVER: Server, MACHINE: Monitor, CLOUD: Cloud, SERVICE: Layers3, PANEL: PanelTop, BACKEND: Terminal, DATABASE: Database, WEBSITE: Globe2, SYSTEM: Box, GROUP: Users, GATEWAY: ShieldCheck };
const EMPTY: MapDocument = { name: "DND Dijital Harita", nodes: [], edges: [] };
type History = { past: MapDocument[]; present: MapDocument; future: MapDocument[] };

export default function DigitalMapPage() {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const t = (turkish: string, english: string) => tr ? turkish : english;
  const [history, setHistory] = useState<History>({ past: [], present: EMPTY, future: [] });
  const doc = history.present;
  const [workspace, setWorkspace] = useState<MapWorkspace | null>(null);
  const [saved, setSaved] = useState(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [denied, setDenied] = useState(false);
  const [selection, setSelection] = useState<MapSelection>(null);
  const [tab, setTab] = useState<"map" | "inventory" | "access" | "screens" | "flows">("map");
  const [viewMode, setViewMode] = useState<MapViewMode>("systems");
  const [layer, setLayer] = useState<MapLayer>("ALL");
  const [systemFilter, setSystemFilter] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const systems = useMemo(() => getSystems(doc), [doc]);
  const media = useMapImages(doc.nodes.map(node => node.imageId || "").filter(Boolean));
  const previewNode = doc.nodes.find(node => node.id === previewId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [help, setHelp] = useState(false);
  const [mapDetails, setMapDetails] = useState(false);
  const [connection, setConnection] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const selectedNode = doc.nodes.find(node => selection?.type === "node" && node.id === selection.id);
  const selectedEdge = doc.edges.find(edge => selection?.type === "edge" && edge.id === selection.id);
  const dirty = JSON.stringify(doc) !== saved;
  const editable = !!workspace?.canEdit && !saving && !loading && !uploading;
  const routes = useMemo(() => accessRoutes(doc), [doc]);
  const visibleRoutes = useMemo(() => routes.filter(route => [route.group.name, route.target.name, route.group.owner, ...route.edges.map(edge => edge.protocol)].join(" ").toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))), [routes, query, locale]);
  const matched = useMemo(() => doc.nodes.filter(node => (!filter || node.kind === filter) && [node.name, node.address, node.technology, node.owner, kindLabel(node.kind, locale)].join(" ").toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))), [doc.nodes, filter, query, locale]);
  const visibleFlows = useMemo(() => doc.edges.filter(edge => edge.kind === "DATA" && [edge.label, edge.protocol, doc.nodes.find(node => node.id === edge.source)?.name, doc.nodes.find(node => node.id === edge.target)?.name].join(" ").toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))), [doc, query, locale]);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setConflict(false);
    try {
      const data = await authedFetch("/digital-map") as MapWorkspace;
      const stored: MapDocument = { name: data.name, nodes: data.nodes, edges: data.edges };
      setWorkspace(data); setSaved(JSON.stringify(stored));
      setHistory({ past: [], present: stored, future: [] }); setSelection(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.includes("403") || message.includes("Forbidden") ? "forbidden" : "load");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "ADMIN" || user.originalRole === "PREVIEW" || user.isPreview) {
      setDenied(true); setLoading(false); return;
    }
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  function change(next: MapDocument) {
    if (!editable) return;
    setHistory(current => JSON.stringify(next) === JSON.stringify(current.present) ? current : { past: [...current.past.slice(-79), current.present], present: next, future: [] });
    setPendingDelete(false);
  }
  function select(next: MapSelection) { setMapDetails(false); setSelection(next); setConnection(false); setPendingDelete(false); }
  function undo() {
    setHistory(current => !current.past.length ? current : { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future] });
    setPendingDelete(false);
  }
  function redo() {
    setHistory(current => !current.future.length ? current : { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) });
    setPendingDelete(false);
  }
  function updateNode(patch: Partial<MapNode>) {
    if (!selectedNode) return;
    change({ ...doc, nodes: doc.nodes.map(node => node.id === selectedNode.id ? { ...node, ...patch } : node) });
  }
  function updateEdge(patch: Partial<MapEdge>) {
    if (!selectedEdge) return;
    const updated = { ...selectedEdge, ...patch };
    if (updated.source === updated.target) return;
    change({ ...doc, edges: doc.edges.map(edge => edge.id === selectedEdge.id ? updated : edge) });
  }
  function childPosition(parentId: string, excludedId?: string) {
    const children = doc.nodes.filter(node => node.parentId === parentId && node.id !== excludedId);
    return { x: CONTAINER_PADDING + 4, y: Math.max(CONTAINER_HEADER + 16, ...children.map(node => node.position.y + node.height + CONTAINER_PADDING)) };
  }
  function moveToParent(parentId: string | null) {
    if (!selectedNode) return;
    if (!parentId) { change(reparentNode(doc, selectedNode.id, null)); return; }
    if (parentId === selectedNode.parentId) return;
    change(normalizeDocument({ ...doc, nodes: doc.nodes.map(node => node.id === selectedNode.id ? { ...node, parentId, position: childPosition(parentId, node.id) } : node) }));
  }
  function addNode(kind: NodeKind, position?: { x: number; y: number }, parentId?: string) {
    if (!editable) return;
    if (doc.nodes.length >= 250) { setError("nodeLimit"); return; }
    if (!position && selectedNode && canContain(selectedNode.kind, kind)) {
      parentId = selectedNode.id;
      const parentPosition = absolutePosition(doc.nodes, parentId);
      const child = childPosition(parentId);
      position = { x: parentPosition.x + child.x, y: parentPosition.y + child.y };
    }
    const node = createNode(kind, position || { x: 60 + (doc.nodes.length % 4) * 45, y: 80 + (doc.nodes.length % 5) * 45 }, locale);
    let next = { ...doc, nodes: [...doc.nodes, node] };
    if (parentId) next = reparentNode(next, node.id, parentId);
    change(normalizeDocument(next)); select({ type: "node", id: node.id }); setTab("map"); setViewMode("technical"); setLayer("ALL"); setSystemFilter(""); setFocusId(node.id);
  }
  function connect(source: string, target: string) {
    if (!editable || source === target || !doc.nodes.some(node => node.id === source) || !doc.nodes.some(node => node.id === target)) return;
    const from = doc.nodes.find(node => node.id === source)!;
    const to = doc.nodes.find(node => node.id === target)!;
    const kind = ["GROUP", "GATEWAY"].includes(from.kind) ? "ACCESS" : to.kind === "DATABASE" ? "DATABASE" : to.kind === "BACKEND" ? "API" : "NETWORK";
    const existing = doc.edges.find(edge => edge.source === source && edge.target === target && edge.kind === kind);
    if (existing) { select({ type: "edge", id: existing.id }); return; }
    if (doc.edges.length >= 1000) { setError("edgeLimit"); return; }
    const edge = createEdge(source, target, kind);
    change({ ...doc, edges: [...doc.edges, edge] }); select({ type: "edge", id: edge.id });
  }
  async function save() {
    if (!workspace || !editable || !dirty) return;
    if (!doc.name.trim() || doc.nodes.some(node => !node.name.trim())) { setError("name"); return; }
    if (doc.nodes.some(node => node.url?.trim() && !safeWebUrl(node.url))) { setError("url"); return; }
    setSaving(true); setError(""); setConflict(false);
    const current = doc;
    try {
      const result = await authedFetch("/digital-map", { method: "PUT", body: JSON.stringify({ ...current, version: workspace.version }) }) as MapWorkspace;
      setWorkspace(result); setSaved(JSON.stringify(current));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("DIGITAL_MAP_VERSION_CONFLICT")) { setConflict(true); setError("conflict"); }
      else if (message.includes("403") || message.includes("Forbidden")) setError("forbidden");
      else setError("save");
    } finally { setSaving(false); }
  }
  async function uploadImage(file: File, nodeId: string) {
    if (!editable) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("imageType"); return; }
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const result = await authedFetch("/digital-map/images", { method: "POST", body: form }) as MapImage;
      media.remember(result.id, file);
      setHistory(current => ({ past: [...current.past.slice(-79), current.present], present: { ...current.present, nodes: current.present.nodes.map(node => node.id === nodeId ? { ...node, imageId: result.id } : node) }, future: [] }));
    } catch { setError("imageUpload"); }
    finally { setUploading(false); }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await workbenchRef.current?.requestFullscreen();
    } catch { setError("fullscreen"); }
  }
  function hostName(node: MapNode) {
    let parent = doc.nodes.find(candidate => candidate.id === node.parentId);
    const seen = new Set<string>();
    while (parent?.parentId && !seen.has(parent.id)) { seen.add(parent.id); parent = doc.nodes.find(candidate => candidate.id === parent!.parentId); }
    return parent?.name || t("Bağımsız öğe", "Standalone item");
  }
  function inspect(id: string) { select({ type: "node", id }); setFocusId(id); }
  function exportDocument() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: "dnd-digital-map", schemaVersion: 1, ...doc }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "dnd-dijital-harita.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  function deleteSelection() {
    if (selectedNode) change(removeNode(doc, selectedNode.id));
    if (selectedEdge) change({ ...doc, edges: doc.edges.filter(edge => edge.id !== selectedEdge.id) });
    select(null);
  }
  const messages: Record<string, string> = {
    url: t("Bağlantılar http:// veya https:// ile başlamalı ve kullanıcı adı/şifre içermemeli.", "Links must start with http:// or https:// and contain no username or password."),
    imageType: t("En fazla 5 MB boyutunda PNG, JPG veya WebP görsel yükleyin.", "Upload a PNG, JPG or WebP image up to 5 MB."),
    imageUpload: t("Görsel yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.", "The image could not be uploaded. Check your connection and retry."),
    fullscreen: t("Tarayıcı tam ekranı açamadı.", "Your browser could not enter full screen."),
    nodeLimit: t("Bir haritada en fazla 250 öğe bulunabilir.", "A map can contain up to 250 items."),
    edgeLimit: t("Bir haritada en fazla 1.000 bağlantı bulunabilir.", "A map can contain up to 1,000 connections."),
    load: t("Harita yüklenemedi. API bağlantısını ve Dijital Harita veritabanı kurulumunu kontrol edip tekrar deneyin.", "The map could not be loaded. Check the API connection and Digital Map database setup, then retry."),
    save: t("Değişiklikler kaydedilemedi. Taslağınız bu ekranda duruyor; yeniden deneyebilirsiniz.", "Changes could not be saved. Your draft is still on this screen; you can retry."),
    name: t("Haritaya ve tüm öğelere bir ad verin.", "Give the map and every item a name."),
    forbidden: t("Bu harita yalnızca ADMIN kullanıcılarına açıktır.", "This map is available only to ADMIN accounts."),
    conflict: t("Harita başka biri tarafından güncellendi. Taslağınızı JSON olarak indirin, ardından güncel haritayı yükleyip değişikliklerinizi uygulayın.", "Someone else updated the map. Download your draft as JSON, then reload the current map and apply your changes."),
  };
  const relatedEdges = selectedNode ? doc.edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id) : [];
  const blockedParents = selectedNode ? descendants(doc.nodes, selectedNode.id) : new Set<string>();

  return <div className={s.page}>
    <header className={s.header}>
      <div className={s.brand}><div className={s.brandIcon}><Network size={26} strokeWidth={1.6} /></div><div><span className={s.eyebrow}>DND · {t("TEKNOLOJİ ENVANTERİ", "TECHNOLOGY INVENTORY")}</span><h1>{t("Dijital Harita", "Digital Map")}</h1><p>{t("Sistemler, barındırma ve veri akışları.", "Systems, hosting and data flows.")}</p></div></div>
      {workspace && <div className={s.headerActions}>
        <span className={s.saveStatus} data-dirty={dirty} role="status">{dirty ? <><span />{t("Kaydedilmemiş değişiklikler", "Unsaved changes")}</> : <><Check size={14} />{t("Tüm değişiklikler kaydedildi", "All changes saved")}</>}</span>
        <button className={s.button} onClick={exportDocument}><Download size={15} />JSON</button>
        {workspace.canEdit && <button className={s.primary} disabled={!dirty || !editable || conflict} onClick={() => void save()}>{saving ? <LoaderCircle className={s.spin} size={16} /> : <Save size={16} />}{saving ? t("Kaydediliyor", "Saving") : t("Haritayı kaydet", "Save map")}</button>}
      </div>}
    </header>
    {(denied || error) && <div className={s.error} role="alert"><span>{denied ? messages.forbidden : messages[error]}</span>{!denied && (error === "load" || conflict) && <button className={s.button} onClick={() => {
      if (!dirty || window.confirm(t("Bu ekrandaki kaydedilmemiş değişiklikler kaldırılıp kayıtlı harita yüklenecek. Devam edilsin mi?", "Unsaved changes will be discarded and the saved map loaded. Continue?"))) void load();
    }}>{t("Tekrar yükle", "Reload")}</button>}</div>}
    {loading && !workspace && <div className={s.loading}><LoaderCircle className={s.spin} size={26} /><p>{t("Dijital harita yükleniyor…", "Loading digital map…")}</p></div>}
    {workspace && <>
      {workspace.version === 0 && <div className={s.templateNotice}><Layers3 size={17} /><span><strong>{t("DND altyapı haritası", "DND infrastructure map")}</strong> · {t("Öğeler ve bağlantılar ekleyerek haritanızı oluşturup kaydedin.", "Add assets and connections to create and save your map.")}</span></div>}
      <div className={s.overview}>
        {[{ Icon: Server, label: t("EC2 sunucusu", "EC2 servers"), value: doc.nodes.filter(node => node.kind === "SERVER").length },
          { Icon: Layers3, label: t("Sistem", "Systems"), value: systems.length },
          { Icon: Database, label: t("Veritabanı", "Databases"), value: doc.nodes.filter(node => node.kind === "DATABASE").length },
          { Icon: Link2, label: t("Bağlantı", "Connections"), value: doc.edges.length }].map(({ Icon, label, value }) => <div key={label} className={s.metric}><Icon size={18} /><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <div className={s.tabsRow}>
        <div className={s.tabs} role="tablist" aria-label={t("Harita görünümleri", "Map views")}>
          {([{ id: "map", Icon: Network, label: t("Altyapı haritası", "Infrastructure map") }, { id: "flows", Icon: Workflow, label: t("Veri akışları", "Data flows") }, { id: "screens", Icon: PanelTop, label: t("Website & paneller", "Websites & panels") }, { id: "inventory", Icon: List, label: t("Envanter", "Inventory") }, { id: "access", Icon: ShieldCheck, label: t("Erişim matrisi", "Access matrix") }] as const).map(({ id, Icon, label }) => <button key={id} role="tab" aria-selected={tab === id} className={s.tab} onClick={() => { setTab(id); setQuery(""); setFilter(""); }}><Icon size={16} />{label}</button>)}
        </div>
        <button className={s.helpButton} aria-expanded={help} onClick={() => setHelp(!help)}><CircleHelp size={16} />{t("Nasıl kullanılır?", "How to use")}</button>
      </div>
      {help && <div className={s.help}><div><strong>01 · {t("Yerleştir", "Place")}</strong><p>{t("Teknik detay görünümünde öğeleri taşıyın ve köşelerinden büyütün. Sunucuların içine sistemler; sistemlerin içine backend, veritabanı ve paneller ekleyebilirsiniz.", "Move and resize items in Technical detail. Place systems inside servers, then backends, databases and panels inside each system.")}</p></div><div><strong>02 · {t("Bağla", "Connect")}</strong><p>{t("Bağlantı noktalarını sürükleyin veya Bağlantı ekle düğmesini kullanın. Veri akışı ve erişim katmanlarıyla ilgili yolları görüntüleyin; sistem filtresiyle bir uygulamaya odaklanın.", "Drag connectors or use Add connection. Switch between data and access layers, and focus on an application with the system filter.")}</p></div><div><strong>03 · {t("Düzenle ve kaydet", "Edit and save")}</strong><p>{t("Öğe ayrıntılarından bağlantı ve ekran görüntüsü ekleyin. Website & paneller sekmesinden önizleyin. Görsel atamaları dahil değişiklikleri Haritayı kaydet ile paylaşın.", "Add links and screenshots in item details. Preview them in Websites & panels. Use Save map to share changes, including image assignments.")}</p></div></div>}
      <div ref={workbenchRef} className={s.workbench} data-tab={tab}>
        {tab === "map" && <aside className={s.palette} aria-label={t("Öğe kütüphanesi", "Item library")}><div className={s.panelHeading}><span>{t("ÖĞE KÜTÜPHANESİ", "ITEM LIBRARY")}</span><Layers3 size={14} /></div><p>{t("Sürükle veya tıkla", "Drag or click to add")}</p><div className={s.paletteItems}>{nodeKinds.map(kind => { const Icon = icons[kind]; return <button key={kind} className={s.paletteItem} data-kind={kind} draggable={editable} disabled={!editable} onDragStart={event => { event.dataTransfer.setData("application/dnd-digital-map", kind); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => addNode(kind)}><span className={s.assetIcon}><Icon size={22} strokeWidth={1.7} /></span><span>{kindLabel(kind, locale)}</span><Plus size={12} /></button>; })}</div><div className={s.paletteHint}><span className={s.hintDiagram}><Server size={18} /><ChevronRight size={12} /><Layers3 size={17} /><ChevronRight size={12} /><Database size={16} /></span>{t("Sunucu → Sistem → Bileşen", "Server → System → Component")}</div></aside>}
        <main className={s.mainArea}>
          {tab === "map" ? <>
            <div className={s.viewToolbar}>
        <div className={s.segmented} aria-label={t("Detay seviyesi", "Detail level")}><button aria-pressed={viewMode === "systems"} onClick={() => setViewMode("systems")}><Layers3 size={14} />{t("Sistem görünümü", "Systems view")}</button><button aria-pressed={viewMode === "technical"} onClick={() => setViewMode("technical")}><Server size={14} />{t("Teknik detay", "Technical detail")}</button></div>
        <div className={s.segmented} aria-label={t("Bağlantı katmanı", "Connection layer")}>{(["ALL", "DATA", "ACCESS"] as const).map(value => <button key={value} aria-pressed={layer === value} onClick={() => setLayer(value)}>{value === "ALL" ? t("Tüm bağlantılar", "All connections") : value === "DATA" ? t("Veri akışı", "Data flow") : t("Erişim yolları", "Access paths")}</button>)}</div>
        <select aria-label={t("Sisteme odaklan", "Focus on system")} value={systemFilter} onChange={event => { setSystemFilter(event.target.value); setFocusId(null); }}><option value="">{t("Tüm sistemler", "All systems")}</option>{systems.map(system => <option key={system.key} value={system.key}>{system.name}</option>)}</select>
      </div>
            <div className={s.mapBar}><span><span className={s.liveDot} />{doc.name}</span><div>{workspace.canEdit && <button className={s.iconButton + " " + s.fullscreenSave} disabled={!dirty || !editable || conflict} onClick={() => void save()} title={t("Değişiklikleri kaydet", "Save changes")} aria-label={t("Değişiklikleri kaydet", "Save changes")}><Save size={16} /></button>}<button className={s.iconButton} title={t("Çalışma alanını büyüt", "Expand workspace")} aria-label={t("Çalışma alanını büyüt", "Expand workspace")} onClick={() => void fullscreen()}><Maximize2 size={16} /></button><button className={s.iconButton} title={t("Harita bilgisi", "Map details")} aria-label={t("Harita bilgisi", "Map details")} aria-expanded={mapDetails} onClick={() => { const show = !mapDetails; select(null); setMapDetails(show); }}><Settings2 size={16} /></button><button className={s.iconButton} title={t("Geri al", "Undo")} aria-label={t("Geri al", "Undo")} disabled={!editable || !history.past.length} onClick={undo}><Undo2 size={16} /></button><button className={s.iconButton} title={t("Yinele", "Redo")} aria-label={t("Yinele", "Redo")} disabled={!editable || !history.future.length} onClick={redo}><Redo2 size={16} /></button><span className={s.divider} /><button className={s.button} disabled={!editable || doc.nodes.length < 2} onClick={() => { select(null); setConnection(true); }}><Link2 size={14} />{t("Bağlantı ekle", "Add connection")}</button></div></div>
            <Canvas viewMode={viewMode} layer={layer} systemFilter={systemFilter} focusId={focusId} imageUrls={media.urls} onPreview={setPreviewId} document={doc} selection={selection} editable={editable} locale={locale} onSelect={select} onChange={change} onConnect={connect} onAdd={addNode} />
            <div className={s.mapFooter}><span>{viewMode === "systems" ? t("Öğeyi seçip ayrıntılarını düzenleyin · Yerleşim için Teknik detay", "Select an item to edit · Use Technical detail to arrange") : t("Noktaları sürükleyerek bağlayın · Öğeleri taşıyarak düzenleyin", "Drag connectors to link · Move items to arrange")}</span><span>{t("Elle tutulan altyapı envanteri", "Manually maintained inventory")}</span></div>
          </> : <>
            <div className={s.tableToolbar}><label className={s.search}><Search size={16} /><input aria-label={t("Envanterde ara", "Search inventory")} placeholder={t("Ad, adres veya ekip ara…", "Search name, address or team…")} value={query} onChange={event => setQuery(event.target.value)} /></label>{tab === "inventory" && <select aria-label={t("Öğe türü filtresi", "Item type filter")} value={filter} onChange={event => setFilter(event.target.value)}><option value="">{t("Tüm öğeler", "All items")}</option>{nodeKinds.map(kind => <option key={kind} value={kind}>{kindLabel(kind, locale)}</option>)}</select>}</div>
            {tab === "screens" ? <div className={s.screenGrid}>{matched.filter(node => ["WEBSITE", "PANEL"].includes(node.kind) || node.imageId).map(node => <article key={node.id} className={s.screenCard}>
              <button className={s.screenThumb} onClick={() => setPreviewId(node.id)} aria-label={t("Önizle: ", "Preview: ") + node.name}>{node.imageId && media.urls[node.imageId] ? <><img src={media.urls[node.imageId]} alt={node.name} loading="lazy" /></> : <><ImageIcon size={32} /><span>{t("Ekran görüntüsü eklenebilir", "Add a screenshot")}</span></>}</button>
              <div className={s.screenBody}><span className={s.screenKind}>{kindLabel(node.kind, locale)} · {hostName(node)}</span><h3>{node.name}</h3><p>{safeWebUrl(node.url) || t("Bağlantı adresi henüz eklenmedi", "No link added yet")}</p><div>{safeWebUrl(node.url) && <a className={s.button} href={safeWebUrl(node.url)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{t("Aç", "Open")}</a>}<button className={s.button} onClick={() => inspect(node.id)}>{t("Düzenle / görsel ekle", "Edit / add image")}</button></div></div>
            </article>)}{!matched.some(node => ["WEBSITE", "PANEL"].includes(node.kind) || node.imageId) && <div className={s.empty}>{t("Eşleşen website veya panel yok.", "No matching websites or panels.")}</div>}</div> : tab === "flows" ? <>
              <p className={s.tableIntro}>{t("Oklar verinin kaynağından alındığı sisteme doğru ilerler. İki yönlü ok, karşılıklı veri alışverişini gösterir.", "Arrows point from the data source to the receiving system. A double arrow indicates data exchange in both directions.")}</p>
              <div className={s.tableWrap}><table className={s.table}><thead><tr>{[t("Kaynak", "Source"), "", t("Hedef", "Destination"), t("Aktarılan veri", "Transferred data"), t("Yöntem", "Method")].map((label, index) => <th key={index}>{label}</th>)}</tr></thead><tbody>{visibleFlows.map(edge => <tr key={edge.id}><td><button className={s.rowLink} onClick={() => inspect(edge.source)}>{doc.nodes.find(node => node.id === edge.source)?.name}</button></td><td>{edge.bidirectional ? <ArrowLeftRight size={18} /> : <ArrowRight size={18} />}</td><td><button className={s.rowLink} onClick={() => inspect(edge.target)}>{doc.nodes.find(node => node.id === edge.target)?.name}</button></td><td><button className={s.rowLink} onClick={() => select({ type: "edge", id: edge.id })}><Link2 size={14} />{edge.label || edgeLabel(edge.kind, locale)}</button></td><td>{edge.protocol || t("Henüz belirtilmedi", "Not specified yet")}</td></tr>)}</tbody></table>{!visibleFlows.length && <div className={s.empty}>{t("Bu görünümde veri akışı yok.", "No data flows in this view.")}</div>}</div>
            </> : tab === "inventory" ? <div className={s.tableWrap}><table className={s.table}><thead><tr>{[t("Öğe", "Item"), t("Barındırıldığı yer", "Hosted in"), t("Adres / teknoloji", "Address / technology"), t("Sorumlu", "Owner"), t("Durum", "Status")].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{matched.map(node => { const Icon = icons[node.kind]; return <tr key={node.id} data-selected={selection?.id === node.id}><td><button className={s.rowLink} onClick={() => select({ type: "node", id: node.id })}><Icon size={17} /><span><strong>{node.name}</strong><small>{kindLabel(node.kind, locale)}</small></span></button></td><td>{doc.nodes.find(parent => parent.id === node.parentId)?.name || "—"}</td><td><span className={s.mono}>{node.address || "—"}</span><small>{node.technology}</small></td><td>{node.owner || "—"}</td><td><span className={s.badge} data-status={node.status}>{statusLabel(node.status, locale)}</span></td></tr>; })}</tbody></table>{!matched.length && <div className={s.empty}>{t("Bu aramayla eşleşen öğe yok.", "No matching items.")}</div>}</div> : <><p className={s.tableIntro}>{t("Gruplardan sistemlere tanımlanan erişim yolları. Bağlantı ayrıntılarını açarak yöntem ve yetkiyi düzenleyebilirsiniz.", "Defined access paths from groups to systems. Open a connection to edit its method and permissions.")}</p><div className={s.tableWrap}><table className={s.table}><thead><tr>{[t("Grup", "Group"), t("Hedef sistem", "Target system"), t("Erişim yolu", "Access path"), t("Yöntem", "Method"), t("Yetki", "Permission")].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{visibleRoutes.map(route => <tr key={route.edges.map(edge => edge.id).join(":")}><td><button className={s.rowLink} onClick={() => select({ type: "node", id: route.group.id })}><Users size={16} /><strong>{route.group.name}</strong></button></td><td><button className={s.rowLink} onClick={() => select({ type: "node", id: route.target.id })}>{route.target.name}<ArrowRight size={13} /></button></td><td><div className={s.path}>{route.path.map((node, index) => <span key={node.id}>{index > 0 && <ChevronRight size={12} />}{node.name}</span>)}</div></td><td>{route.edges.map(edge => <button key={edge.id} className={s.connectionPill} onClick={() => select({ type: "edge", id: edge.id })}>{edge.protocol || t("Yöntem ekle", "Set method")}<Link2 size={11} /></button>)}</td><td>{route.edges.map(edge => <div key={edge.id} className={s.permission}>{edge.access || "—"}</div>)}</td></tr>)}</tbody></table>{routes.length > 0 && !visibleRoutes.length && <div className={s.empty}>{t("Bu aramayla eşleşen erişim yolu yok.", "No matching access paths.")}</div>}{!routes.length && <div className={s.empty}><ShieldCheck size={28} /><p>{t("Bir grubu sisteme veya erişim noktasına bağlayıp bağlantı türünü Erişim olarak seçin.", "Connect a group to a system or gateway and choose the Access connection type.")}</p></div>}</div><div className={s.accessNote}>{t("Bu harita erişimleri belgeler; sistemlerin gerçek yetki ayarlarını değiştirmez.", "This map documents access; it does not change permissions on your systems.")}</div></>}
          </>}
        </main>
        {(selectedNode || selectedEdge || connection || mapDetails) && <aside className={s.inspector} aria-label={t("Öğe ayrıntıları", "Item details")}>
          <div className={s.panelHeading}><span>{connection || selectedEdge ? t("BAĞLANTI AYRINTILARI", "CONNECTION DETAILS") : selectedNode ? t("ÖĞE AYRINTILARI", "ITEM DETAILS") : t("HARİTA BİLGİSİ", "MAP DETAILS")}</span>{(selection || connection || mapDetails) && <button className={s.iconButton} title={t("Seçimi kapat", "Close selection")} aria-label={t("Seçimi kapat", "Close selection")} onClick={() => select(null)}><X size={15} /></button>}</div>
          {connection ? <ConnectionForm nodes={doc.nodes} initialSource={selectedNode?.id} tr={tr} onConnect={connect} /> : selectedNode ? <>
            <div className={s.inspectorIdentity} data-kind={selectedNode.kind}>{(() => { const Icon = icons[selectedNode.kind]; return <span className={s.assetIcon}><Icon size={26} /></span>; })()}<div><strong>{kindLabel(selectedNode.kind, locale)}</strong><small>{environmentLabel(selectedNode.environment, locale)}</small></div></div>
            <fieldset disabled={!editable} className={s.fields}>
              <label>{t("Öğe adı", "Item name")}<input value={selectedNode.name} maxLength={160} onChange={event => updateNode({ name: event.target.value })} /></label>
              <label>{t("Sistem grubu", "System group")}<input value={selectedNode.systemKey || ""} maxLength={80} placeholder="dnd-crm" onChange={event => updateNode({ systemKey: event.target.value })} /></label>
              <label>{t("Barındırıldığı yer", "Hosted in")}<select value={selectedNode.parentId || ""} onChange={event => moveToParent(event.target.value || null)}><option value="">{t("Harita üzerinde bağımsız", "Standalone on map")}</option>{doc.nodes.filter(node => !blockedParents.has(node.id) && canContain(node.kind, selectedNode.kind)).map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
              <label>{t("Tıklanabilir bağlantı", "Clickable link")}<input type="url" value={selectedNode.url || ""} maxLength={2048} placeholder="https://…" onChange={event => updateNode({ url: event.target.value })} /></label>
              {safeWebUrl(selectedNode.url) && <a className={s.button} href={safeWebUrl(selectedNode.url)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{t("Sistemi yeni sekmede aç", "Open system in a new tab")}</a>}
              <label>{t("Adres / IP / alan adı", "Address / IP / domain")}<input value={selectedNode.address} maxLength={500} placeholder={selectedNode.kind === "WEBSITE" ? "portal.example.com" : "10.0.0.10"} onChange={event => updateNode({ address: event.target.value })} /></label>
              <label>{t("Teknoloji / işletim sistemi", "Technology / operating system")}<input value={selectedNode.technology} maxLength={240} placeholder={selectedNode.kind === "DATABASE" ? "PostgreSQL 16" : "Linux, Node.js…"} onChange={event => updateNode({ technology: event.target.value })} /></label>
              <div className={s.fieldPair}><label>{t("Ortam", "Environment")}<select value={selectedNode.environment} onChange={event => updateNode({ environment: event.target.value as MapNode["environment"] })}>{(["PRODUCTION", "STAGING", "DEVELOPMENT"] as const).map(value => <option key={value} value={value}>{environmentLabel(value, locale)}</option>)}</select></label><label>{t("Durum", "Status")}<select value={selectedNode.status} onChange={event => updateNode({ status: event.target.value as MapNode["status"] })}>{(["ACTIVE", "PLANNED", "MAINTENANCE"] as const).map(value => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select></label></div>
              <label>{t("Sorumlu ekip / kişi", "Responsible team / person")}<input value={selectedNode.owner} maxLength={160} onChange={event => updateNode({ owner: event.target.value })} /></label>
              <label>{t("Notlar", "Notes")}<textarea rows={3} value={selectedNode.notes} maxLength={4000} onChange={event => updateNode({ notes: event.target.value })} /></label>
            </fieldset>
            <section className={s.imageEditor}><div className={s.sectionTitle}>{t("Ekran görüntüsü", "Screenshot")}</div>
              {selectedNode.imageId && media.urls[selectedNode.imageId] && <button className={s.uploadedThumb} onClick={() => setPreviewId(selectedNode.id)} aria-label={t("Görseli büyüt", "Enlarge image")}><img src={media.urls[selectedNode.imageId]} alt={selectedNode.name} /></button>}
              {selectedNode.imageId && media.errors.includes(selectedNode.imageId) && <button className={s.button} onClick={media.retry}>{t("Görsel yüklenemedi. Tekrar dene", "Image could not load. Retry")}</button>}
              <label className={s.uploadButton} aria-disabled={!editable}><Upload size={15} />{uploading ? t("Yükleniyor…", "Uploading…") : t("Görsel yükle", "Upload image")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!editable} aria-label={t("Ekran görüntüsü yükle", "Upload screenshot")} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file, selectedNode.id); event.target.value = ""; }} /></label>
              <small>PNG / JPG / WebP · {t("En fazla 5 MB", "Up to 5 MB")}</small>
              {selectedNode.imageId && editable && <button className={s.deleteButton} onClick={() => updateNode({ imageId: "" })}>{t("Görseli kaldır", "Remove image")}</button>}
              {(selectedNode.url || selectedNode.imageId) && <button className={s.button} onClick={() => setPreviewId(selectedNode.id)}><ImageIcon size={14} />{t("Önizlemeyi aç", "Open preview")}</button>}
            </section>
            <div className={s.relations}><div className={s.sectionTitle}>{t("Bağlantılar", "Connections")} <span>{relatedEdges.length}</span>{editable && <button className={s.iconButton} title={t("Bağlantı ekle", "Add connection")} onClick={() => setConnection(true)}><Plus size={14} /></button>}</div>{relatedEdges.map(edge => <button key={edge.id} className={s.relation} onClick={() => select({ type: "edge", id: edge.id })}><Link2 size={13} /><span>{doc.nodes.find(node => node.id === (edge.source === selectedNode.id ? edge.target : edge.source))?.name}<small>{edge.protocol || edgeLabel(edge.kind, locale)} · {edge.bidirectional ? t("İki yönlü", "Bidirectional") : edge.source === selectedNode.id ? t("Giden", "Outgoing") : t("Gelen", "Incoming")}</small></span><ChevronRight size={14} /></button>)}</div>
          </> : selectedEdge ? <>
            <div className={s.connectionHeading}><span>{doc.nodes.find(node => node.id === selectedEdge.source)?.name}</span>{selectedEdge.bidirectional ? <ArrowLeftRight size={18} /> : <ArrowRight size={18} />}<span>{doc.nodes.find(node => node.id === selectedEdge.target)?.name}</span></div>
            <fieldset disabled={!editable} className={s.fields}>
              <label>{t("Kaynak", "Source")}<select value={selectedEdge.source} onChange={event => updateEdge({ source: event.target.value })}>{doc.nodes.filter(node => node.id !== selectedEdge.target).map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
              <label>{t("Hedef", "Target")}<select value={selectedEdge.target} onChange={event => updateEdge({ target: event.target.value })}>{doc.nodes.filter(node => node.id !== selectedEdge.source).map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
              <label>{t("Bağlantı türü", "Connection type")}<select value={selectedEdge.kind} onChange={event => updateEdge({ kind: event.target.value as MapEdge["kind"], ...(event.target.value === "ACCESS" ? { bidirectional: false } : {}) })}>{edgeKinds.map(kind => <option key={kind} value={kind}>{edgeLabel(kind, locale)}</option>)}</select></label>
              {selectedEdge.kind !== "ACCESS" && <label>{t("Veri yönü", "Data direction")}<select value={selectedEdge.bidirectional ? "both" : "one"} onChange={event => updateEdge({ bidirectional: event.target.value === "both" })}><option value="one">{t("Kaynak → Hedef", "Source → Target")}</option><option value="both">{t("İki yönlü ↔", "Bidirectional ↔")}</option></select></label>}
              <label>{t("Etiket", "Label")}<input value={selectedEdge.label} maxLength={160} onChange={event => updateEdge({ label: event.target.value })} /></label>
              <label>{t("Erişim yöntemi / protokol", "Access method / protocol")}<input value={selectedEdge.protocol} maxLength={160} placeholder="HTTPS · VPN · SSH · TCP 5432" onChange={event => updateEdge({ protocol: event.target.value })} /></label>
              <label>{t("Yetki / erişim seviyesi", "Permission / access level")}<input value={selectedEdge.access} maxLength={240} placeholder={t("Salt okunur, yönetici, SSO + MFA…", "Read-only, administrator, SSO + MFA…")} onChange={event => updateEdge({ access: event.target.value })} /></label>
              <label>{t("Notlar", "Notes")}<textarea rows={4} value={selectedEdge.notes} maxLength={4000} onChange={event => updateEdge({ notes: event.target.value })} /></label>
            </fieldset>
          </> : <>
            <div className={s.mapIdentity}><Network size={36} strokeWidth={1.3} /><h2>{t("Büyük resmi görün.", "See the whole picture.")}</h2><p>{t("Bir öğeye veya bağlantıya tıklayarak ayrıntılarını burada düzenleyin.", "Click an item or a connection to edit its details here.")}</p></div>
            <fieldset disabled={!editable} className={s.fields}><label>{t("Harita adı", "Map name")}<input value={doc.name} maxLength={160} onChange={event => change({ ...doc, name: event.target.value })} /></label></fieldset>
            <div className={s.legend}><h3>{t("Bağlantı anahtarı", "Connection legend")}</h3>{edgeKinds.map(kind => <div key={kind}><i data-kind={kind} /><span>{edgeLabel(kind, locale)}</span></div>)}</div>
            <div className={s.mapMeta}><span>{t("Son kayıt", "Last saved")}</span><strong>{workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleString(locale) : t("Henüz kaydedilmedi", "Not saved yet")}</strong>{workspace.updatedByName && <small>{workspace.updatedByName}</small>}</div>
          </>}
          {editable && (selectedNode || selectedEdge) && !connection && <div className={s.deleteArea}>{pendingDelete ? <><p>{selectedNode && descendants(doc.nodes, selectedNode.id).size > 1 ? t("Bu öğe, içindeki tüm öğeler ve ilgili bağlantılar kaldırılacak.", "This item, its children and their connections will be removed.") : t("Seçili öğe veya bağlantı haritadan kaldırılsın mı?", "Remove the selected item or connection from the map?")}</p><div><button className={s.button} onClick={() => setPendingDelete(false)}>{t("Vazgeç", "Cancel")}</button><button className={s.danger} onClick={deleteSelection}>{t("Kaldır", "Remove")}</button></div></> : <button className={s.deleteButton} onClick={() => setPendingDelete(true)}><Trash2 size={14} />{t("Haritadan kaldır", "Remove from map")}</button>}</div>}
        </aside>}
        {previewNode && <AssetPreview key={previewNode.id} node={previewNode} imageUrl={media.urls[previewNode.imageId || ""]} tr={tr} onClose={() => setPreviewId(null)} />}
      </div>
    </>}
  </div>;
}

function ConnectionForm({ nodes, initialSource, tr, onConnect }: { nodes: MapNode[]; initialSource?: string; tr: boolean; onConnect: (source: string, target: string) => void }) {
  const [source, setSource] = useState(initialSource || nodes[0]?.id || "");
  const [target, setTarget] = useState(nodes.find(node => node.id !== (initialSource || nodes[0]?.id))?.id || "");
  return <form className={s.fields} onSubmit={event => { event.preventDefault(); onConnect(source, target); }}><p className={s.formHint}>{tr ? "Bağlamak istediğiniz iki öğeyi seçin. Ardından protokol ve yetki bilgilerini ekleyin." : "Choose the two items to connect, then add the protocol and permissions."}</p><label>{tr ? "Kaynak öğe" : "Source item"}<select value={source} onChange={event => setSource(event.target.value)}>{nodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>{tr ? "Hedef öğe" : "Target item"}<select value={target} onChange={event => setTarget(event.target.value)}>{nodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><button className={s.primary} disabled={!source || !target || source === target}><Link2 size={15} />{tr ? "Bağlantı oluştur" : "Create connection"}</button></form>;
}
