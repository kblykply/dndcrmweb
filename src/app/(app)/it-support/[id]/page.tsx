import TicketDetailView from "../_components/TicketDetailView";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketDetailView key={id} id={id} />;
}
