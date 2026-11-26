"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_SESSION_CHANGED_EVENT, getUser } from "@/lib/auth";

// Covers routes outside the main (app) layout as well. API authorization is independent.
export default function AgencyEntryBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{
    ready: boolean;
    restricted: boolean;
  }>({ ready: false, restricted: false });
  useEffect(() => {
    const sync = () =>
      setSession({
        ready: true,
        restricted: getUser()?.role === "AGENCY_ENTRY",
      });
    sync();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const blocked =
    session.restricted && !/^\/agency-customers\/?$/.test(pathname);
  useEffect(() => {
    if (blocked) router.replace("/agency-customers");
  }, [blocked, router]);
  return session.ready && !blocked ? children : null;
}
