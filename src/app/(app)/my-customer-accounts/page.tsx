"use client";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import PaymentTrackingList from "../finance/payment-tracking/_components/PaymentTrackingList";
import { TrackingSessionBoundary } from "../finance/payment-tracking/_components/TrackingShell";
import SalesLedgerMappings from "./SalesLedgerMappings";
function Home() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRole(getUser()?.role || ""));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (role === null) return null;
  return role === "ADMIN" ? (
    <SalesLedgerMappings />
  ) : (
    <PaymentTrackingList salesMode />
  );
}
export default function CustomerAccountsPage() {
  return (
    <TrackingSessionBoundary>
      <Home />
    </TrackingSessionBoundary>
  );
}
