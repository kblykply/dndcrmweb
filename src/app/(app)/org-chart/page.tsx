"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type OrgNode = {
  id: string;
  name: string;
  type?: string | null;
  color?: string | null;
  parentId?: string | null;
  order: number;
  children: OrgNode[];
};

type FlatOrgNode = {
  id: string;
  name: string;
  type?: string | null;
  color?: string | null;
  parentId?: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function getNodeBg(color?: string | null) {
  if (!color) return "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)";

  const c = color.trim().toLowerCase();

  if (
    c === "yellow" ||
    c === "#facc15" ||
    c === "#fde68a" ||
    c === "#f59e0b"
  ) {
    return "linear-gradient(180deg, #fde68a 0%, #fcd34d 100%)";
  }

  if (
    c === "green" ||
    c === "#86efac" ||
    c === "#4ade80" ||
    c === "#22c55e"
  ) {
    return "linear-gradient(180deg, #bbf7d0 0%, #86efac 100%)";
  }

  if (
    c === "blue" ||
    c === "#93c5fd" ||
    c === "#60a5fa" ||
    c === "#3b82f6"
  ) {
    return "linear-gradient(180deg, #bfdbfe 0%, #93c5fd 100%)";
  }

  if (
    c === "pink" ||
    c === "#f9a8d4" ||
    c === "#f472b6"
  ) {
    return "linear-gradient(180deg, #fbcfe8 0%, #f9a8d4 100%)";
  }

  if (
    c === "purple" ||
    c === "#c4b5fd" ||
    c === "#a78bfa"
  ) {
    return "linear-gradient(180deg, #ddd6fe 0%, #c4b5fd 100%)";
  }

  if (c.startsWith("#")) {
    return color;
  }

  return "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)";
}

function HierarchyNode({
  node,
  level = 0,
}: {
  node: OrgNode;
  level?: number;
}) {
  const hasChildren = node.children?.length > 0;

  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 18,
        minWidth: 220,
      }}
    >
      <div
        style={{
          minWidth: 180,
          maxWidth: 260,
          padding: "14px 18px",
          borderRadius: 18,
          border: "1px solid rgba(15,23,42,.08)",
          background: getNodeBg(node.color),
          boxShadow: "0 10px 30px rgba(15,23,42,.10)",
          textAlign: "center",
        }}
      >
        {node.type ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "rgba(15,23,42,.58)",
              marginBottom: 6,
            }}
          >
            {node.type}
          </div>
        ) : null}

        <div
          style={{
            fontSize: level === 0 ? 18 : 15,
            fontWeight: 900,
            lineHeight: 1.25,
            color: "#0f172a",
            wordBreak: "break-word",
          }}
        >
          {node.name}
        </div>
      </div>

      {hasChildren ? (
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 16,
            width: "100%",
          }}
        >
          <div
            style={{
              width: 2,
              height: 18,
              background: "rgba(100,116,139,.45)",
              borderRadius: 999,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 22,
              alignItems: "flex-start",
              justifyContent: "center",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            {node.children.map((child) => (
              <HierarchyNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function OrgChartPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [tree, setTree] = useState<OrgNode[]>([]);
  const [flat, setFlat] = useState<FlatOrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showEditor, setShowEditor] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [color, setColor] = useState("yellow");
  const [parentId, setParentId] = useState("");
  const [order, setOrder] = useState("0");

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  const role = me?.role as string | undefined;
  const canEdit = role === "ADMIN" || role === "MANAGER";

  async function loadAll() {
    setErr(null);
    setLoading(true);

    try {
      const [treeRes, flatRes] = await Promise.all([
        authedFetch("/org-chart"),
        authedFetch("/org-chart/flat"),
      ]);

      setTree(Array.isArray(treeRes) ? treeRes : []);
      setFlat(Array.isArray(flatRes) ? flatRes : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setTree([]);
      setFlat([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    loadAll();
  }, [mounted]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("");
    setColor("yellow");
    setParentId("");
    setOrder("0");
  }

  function startCreate() {
    resetForm();
    setShowEditor(true);
  }

  function startEdit(node: FlatOrgNode) {
    setEditingId(node.id);
    setName(node.name || "");
    setType(node.type || "");
    setColor(node.color || "yellow");
    setParentId(node.parentId || "");
    setOrder(String(node.order ?? 0));
    setShowEditor(true);
  }

  async function saveNode() {
    if (!name.trim()) return;

    setSaving(true);
    setErr(null);

    try {
      const body = {
        name: name.trim(),
        type: type.trim() || null,
        color: color.trim() || null,
        parentId: parentId || null,
        order: Number(order || 0),
      };

      if (editingId) {
        await authedFetch(`/org-chart/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await authedFetch("/org-chart", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      resetForm();
      setShowEditor(false);
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNode(id: string, label: string) {
    const ok = window.confirm(
      locale === "tr"
        ? `"${label}" düğümünü silmek istediğinize emin misiniz?`
        : `Are you sure you want to delete "${label}"?`,
    );

    if (!ok) return;

    setErr(null);

    try {
      await authedFetch(`/org-chart/${id}`, {
        method: "DELETE",
      });

      if (editingId === id) {
        resetForm();
      }

      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  const pageTitle = safeTranslate(
    t,
    "orgChart.title",
    locale === "tr" ? "Organizasyon Şeması" : "Organizational Chart",
  );

  const pageSubtitle = safeTranslate(
    t,
    "orgChart.subtitle",
    locale === "tr"
      ? "Şirket yapısını herkes görebilir, yönetici ve admin düzenleyebilir."
      : "Everyone can view the company structure, managers and admins can edit it.",
  );

  const rootCount = useMemo(() => tree.length, [tree]);
  const totalCount = useMemo(() => flat.length, [flat]);

  if (!mounted) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        className="flex-between"
        style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {safeTranslate(
              t,
              "orgChart.label",
              locale === "tr" ? "Kurumsal Yapı" : "Corporate Structure",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{pageTitle}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {pageSubtitle}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => loadAll()} disabled={loading}>
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canEdit ? (
            <button className="primary" onClick={startCreate}>
              {safeTranslate(
                t,
                "orgChart.newNode",
                locale === "tr" ? "Yeni Düğüm" : "New Node",
              )}
            </button>
          ) : null}
        </div>
      </div>

      {err ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(239,68,68,.35)",
            background: "rgba(239,68,68,.08)",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "orgChart.stats.rootNodes",
              locale === "tr" ? "Ana Düğüm" : "Root Nodes",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{rootCount}</div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "orgChart.stats.totalNodes",
              locale === "tr" ? "Toplam Düğüm" : "Total Nodes",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{totalCount}</div>
        </div>
      </div>

      {canEdit && showEditor ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {editingId
              ? safeTranslate(
                  t,
                  "orgChart.editNode",
                  locale === "tr" ? "Düğüm Düzenle" : "Edit Node",
                )
              : safeTranslate(
                  t,
                  "orgChart.createNode",
                  locale === "tr" ? "Yeni Düğüm Oluştur" : "Create Node",
                )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={safeTranslate(
                t,
                "orgChart.fields.name",
                locale === "tr" ? "İsim / Başlık" : "Name / Title",
              )}
            />

            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder={safeTranslate(
                t,
                "orgChart.fields.type",
                locale === "tr" ? "Tip" : "Type",
              )}
            />

            <select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="yellow">Yellow</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="pink">Pink</option>
              <option value="purple">Purple</option>
            </select>

            <input
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder={safeTranslate(
                t,
                "orgChart.fields.order",
                locale === "tr" ? "Sıra" : "Order",
              )}
            />

            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              style={{ gridColumn: "span 2" }}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "orgChart.fields.noParent",
                  locale === "tr" ? "Üst düğüm yok" : "No parent",
                )}
              </option>

              {flat
                .filter((node) => node.id !== editingId)
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={() => {
                resetForm();
                setShowEditor(false);
              }}
            >
              {safeTranslate(
                t,
                "common.cancel",
                locale === "tr" ? "Vazgeç" : "Cancel",
              )}
            </button>

            <button
              className="primary"
              onClick={saveNode}
              disabled={saving || !name.trim()}
            >
              {saving
                ? safeTranslate(
                    t,
                    "orgChart.saving",
                    locale === "tr" ? "Kaydediliyor..." : "Saving...",
                  )
                : safeTranslate(
                    t,
                    "common.save",
                    locale === "tr" ? "Kaydet" : "Save",
                  )}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ overflow: "auto", padding: 22 }}>
        {loading ? (
          <div>{t("common.loading")}</div>
        ) : tree.length === 0 ? (
          <div className="muted">
            {safeTranslate(
              t,
              "orgChart.noData",
              locale === "tr"
                ? "Henüz organizasyon şeması düğümü bulunmuyor."
                : "No organizational chart nodes yet.",
            )}
          </div>
        ) : (
          <div
            style={{
              minWidth: 900,
              display: "flex",
              gap: 28,
              justifyContent: "center",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {tree.map((node) => (
              <HierarchyNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "orgChart.editorTable",
              locale === "tr" ? "Düğüm Listesi" : "Node List",
            )}
          </div>

          <div style={{ overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>
                    {safeTranslate(t, "orgChart.table.name", locale === "tr" ? "İsim" : "Name")}
                  </th>
                  <th>
                    {safeTranslate(t, "orgChart.table.type", locale === "tr" ? "Tip" : "Type")}
                  </th>
                  <th>
                    {safeTranslate(t, "orgChart.table.parent", locale === "tr" ? "Üst" : "Parent")}
                  </th>
                  <th>
                    {safeTranslate(t, "orgChart.table.order", locale === "tr" ? "Sıra" : "Order")}
                  </th>
                  <th>
                    {safeTranslate(
                      t,
                      "orgChart.table.actions",
                      locale === "tr" ? "İşlem" : "Actions",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {flat.map((node) => {
                  const parent = flat.find((x) => x.id === node.parentId);

                  return (
                    <tr key={node.id}>
                      <td style={{ fontWeight: 800 }}>{node.name}</td>
                      <td>{node.type || "-"}</td>
                      <td>{parent?.name || "-"}</td>
                      <td>{node.order ?? 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => startEdit(node)}>
                            {safeTranslate(
                              t,
                              "common.edit",
                              locale === "tr" ? "Düzenle" : "Edit",
                            )}
                          </button>
                          <button
                            className="danger"
                            onClick={() => deleteNode(node.id, node.name)}
                          >
                            {safeTranslate(
                              t,
                              "common.delete",
                              locale === "tr" ? "Sil" : "Delete",
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {flat.length === 0 ? (
              <div style={{ padding: 14, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "orgChart.noFlatData",
                  locale === "tr" ? "Düğüm bulunamadı." : "No nodes found.",
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}