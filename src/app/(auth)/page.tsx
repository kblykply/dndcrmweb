"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length > 3,
    [email, password]
  );

  async function login() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setSession(res.user, res.accessToken);
      window.location.href = "/leads";
    } catch (e: any) {
      setErr("E-posta veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ width: "100%", maxWidth: 420 }}>
      <section
        style={{
          background: "#fff",
          border: "1px solid #e9eaee",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(15,23,42,.08)",
          padding: 22,
          display: "grid",
          gap: 18,
        }}
      >
        {/* Logo */}
        <div style={{ display: "grid", gap: 12, justifyItems: "center", textAlign: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              display: "grid",
              placeItems: "center",
            }}
          >
            <img
              src="/dndblack.png"
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
              CRM Giriş
            </h2>
            <p style={{ fontSize: 13, color: "#667085", marginTop: 4 }}>
              Hesabınıza erişmek için giriş yapın
            </p>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#475467" }}>
              E-posta
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@firma.com"
              type="email"
              autoComplete="email"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#475467" }}>
              Şifre
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </label>

          <button
            className="primary"
            onClick={login}
            disabled={loading || !canSubmit}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          {err && (
            <div
              style={{
                border: "1px solid rgba(239,68,68,.35)",
                background: "rgba(239,68,68,.08)",
                padding: 12,
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}