import { TrackingSessionBoundary } from "../payment-tracking/_components/TrackingShell";
import CollectionReport from "./_components/CollectionReport";

export default function CollectionReportPage() {
  return <TrackingSessionBoundary><CollectionReport /></TrackingSessionBoundary>;
}
