"use client";
import { useParams } from "next/navigation";
import PaymentTrackingDetail from "../../finance/payment-tracking/_components/PaymentTrackingDetail";
import { TrackingSessionBoundary } from "../../finance/payment-tracking/_components/TrackingShell";
export default function CustomerAccountPage() {
  const { key } = useParams<{ key: string }>();
  return (
    <TrackingSessionBoundary>
      <PaymentTrackingDetail key={key} caseKey={key} salesMode />
    </TrackingSessionBoundary>
  );
}
