"use client";

import { useState } from "react";
import { API } from "@/lib/api";
import { getAccessToken, getUser, setSession } from "@/lib/auth";

export default function ProfileSettings() {
  const me = getUser();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function upload() {
    if (!file) return;
    setErr(null);
    setSaving(true);

    try {
      const token = getAccessToken();
      if (!token) throw new Error("Not logged in");

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const updated = { ...(me || {}), avatarUrl: data.avatarUrl };
      setSession(updated, token);

      setFile(null);
      alert("Profile photo updated");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <h2>Profile</h2>
      <p className="muted">Upload a profile picture (jpeg/png/webp up to 3MB).</p>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: "#111", overflow: "hidden" }}>
          {me?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>

        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />

        <button className="primary" onClick={upload} disabled={!file || saving}>
          {saving ? "Uploading..." : "Save"}
        </button>
      </div>

      {err ? <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre> : null}
    </div>
  );
}