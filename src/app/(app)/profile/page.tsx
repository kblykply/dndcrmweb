"use client";

import { useState } from "react";
import { API } from "@/lib/api";
import {
  getAccessToken,
  getRefreshToken,
  getUser,
  setSession,
  clearSession,
  setAccessToken,
} from "@/lib/auth";



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
    const refreshToken = getRefreshToken();

    if (!token || !refreshToken) {
      throw new Error("Not logged in");
    }

    const fd = new FormData();
    fd.append("file", file);

    let res = await fetch(`${API}/users/me/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (res.status === 401 && refreshToken) {
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) {
        clearSession();
        window.location.href = "/";
        throw new Error("Session expired");
      }

      const refreshData = await refreshRes.json();
      setAccessToken(refreshData.accessToken);

      res = await fetch(`${API}/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshData.accessToken}` },
        body: fd,
      });
    }

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = await res.json();

    const updatedUser = {
      ...(me || {}),
      avatarUrl: data.avatarUrl,
    };

    setSession(updatedUser, getAccessToken() || token, refreshToken);

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

      <p className="muted">
        Upload a profile picture (jpeg/png/webp up to 3MB).
      </p>

      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: "#111",
            overflow: "hidden",
          }}
        >
          {me?.avatarUrl ? (
            <img
              src={me.avatarUrl}
              alt="avatar"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button className="primary" onClick={upload} disabled={!file || saving}>
          {saving ? "Uploading..." : "Save"}
        </button>
      </div>

      {err ? <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre> : null}
    </div>
  );
}