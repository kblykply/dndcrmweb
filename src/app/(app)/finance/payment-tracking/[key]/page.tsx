"use client";

import { useParams } from "next/navigation";
import PaymentTrackingDetail from "../_components/PaymentTrackingDetail";
import { TrackingSessionBoundary } from "../_components/TrackingShell";

export default function PaymentTrackingCasePage() {
  const { key } = useParams<{ key: string }>();
  let caseKey = key;
  try {
    caseKey = decodeURIComponent(key);
  } catch {
    /* API validates the key. */
  }
  return <TrackingSessionBoundary><PaymentTrackingDetail key={caseKey} caseKey={caseKey} /></TrackingSessionBoundary>;
}
