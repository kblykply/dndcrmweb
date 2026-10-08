import PaymentTrackingList from "./_components/PaymentTrackingList";
import { TrackingSessionBoundary } from "./_components/TrackingShell";

export default function PaymentTrackingPage() {
  return <TrackingSessionBoundary><PaymentTrackingList /></TrackingSessionBoundary>;
}
