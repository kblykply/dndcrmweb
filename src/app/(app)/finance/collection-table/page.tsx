import { TrackingSessionBoundary } from "../payment-tracking/_components/TrackingShell";
import CollectionTable from "./CollectionTable";

export default function CollectionTablePage() {
  return (
    <TrackingSessionBoundary>
      <CollectionTable />
    </TrackingSessionBoundary>
  );
}
