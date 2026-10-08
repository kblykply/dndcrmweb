import ProjectDetailView from "../_components/ProjectDetailView";

export default async function DigitalTeamProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailView key={id} id={id} />;
}
