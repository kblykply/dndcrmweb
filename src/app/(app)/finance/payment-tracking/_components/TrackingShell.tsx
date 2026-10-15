"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  AUTH_SESSION_CHANGED_EVENT,
  getAuthSessionVersion,
  getUser,
} from "@/lib/auth";
import s from "../payment-tracking.module.css";

function sessionKey() {
  const user = getUser();
  return JSON.stringify([
    user?.id,
    user?.role,
    user?.originalRole,
    !!user?.isPreview,
    getAuthSessionVersion(),
  ]);
}

function subscribeSession(changed: () => void) {
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, changed);
    window.removeEventListener("storage", changed);
  };
}

/** Real session changes discard visible data, drafts and in-flight requests. */
export function TrackingSessionBoundary({ children }: { children: ReactNode }) {
  const identity = useSyncExternalStore(
    subscribeSession,
    sessionKey,
    () => "server",
  );
  return <Fragment key={identity}>{children}</Fragment>;
}

export function useTrackingAccess(salesMode = false) {
  const [access, setAccess] = useState<
    "checking" | "login" | "denied" | "allowed"
  >("checking");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const user = getUser() as {
        role?: string;
        originalRole?: string;
        isPreview?: boolean;
      } | null;
      setAccess(
        !user
          ? "login"
          : (salesMode ? ["SALES"] : ["ADMIN", "ACCOUNTING"]).includes(
                user.role || "",
              ) &&
              user.originalRole !== "PREVIEW" &&
              !user.isPreview
            ? "allowed"
            : "denied",
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [salesMode]);
  return access;
}

export function Loading({ tr }: { tr: boolean }) {
  return (
    <div className={s.empty} role="status">
      <LoaderCircle size={24} className={s.spin} />
      {tr ? "Takip dosyaları okunuyor…" : "Loading payment cases…"}
    </div>
  );
}

export function Access({
  access,
  tr,
  salesMode = false,
}: {
  access: string;
  tr: boolean;
  salesMode?: boolean;
}) {
  if (access === "checking") return <Loading tr={tr} />;
  return (
    <section className={s.empty}>
      <ShieldCheck size={30} />
      <h1>
        {salesMode
          ? tr
            ? "Müşteri Carilerim"
            : "My Customer Accounts"
          : tr
            ? "Ödeme Takip"
            : "Payment Tracking"}
      </h1>
      <p>
        {access === "login"
          ? tr
            ? "Devam etmek için giriş yapın."
            : "Sign in to continue."
          : salesMode
            ? tr
              ? "Bu çalışma alanı satışçı hesaplarına açıktır."
              : "This workspace is for salespeople."
            : tr
              ? "Bu çalışma alanı yönetici ve muhasebe hesaplarına açıktır."
              : "This workspace is available to administrators and accounting accounts."}
      </p>
      <Link
        className={s.button}
        href={access === "login" ? "/" : salesMode ? "/leads" : "/finance"}
      >
        {tr ? "Geri dön" : "Go back"}
      </Link>
    </section>
  );
}

export function ErrorMessage({
  message,
  retry,
  busy,
  tr,
}: {
  message: string;
  retry?: () => void;
  busy?: boolean;
  tr: boolean;
}) {
  return (
    <div className={s.error} role="alert">
      <span>
        <AlertCircle
          size={15}
          style={{ verticalAlign: "middle", marginRight: 7 }}
        />
        {message}
      </span>
      {retry && (
        <button className={s.button} disabled={busy} onClick={retry}>
          <RefreshCw size={14} />
          {tr ? "Yeniden dene" : "Retry"}
        </button>
      )}
    </div>
  );
}
