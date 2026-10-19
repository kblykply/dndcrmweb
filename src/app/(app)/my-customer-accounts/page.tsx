"use client";
import PaymentTrackingList from "../finance/payment-tracking/_components/PaymentTrackingList";
import { TrackingSessionBoundary } from "../finance/payment-tracking/_components/TrackingShell";
export default function CustomerAccountsPage() {
  return (
    <TrackingSessionBoundary>
      <PaymentTrackingList salesMode />
    </TrackingSessionBoundary>
  );
}
