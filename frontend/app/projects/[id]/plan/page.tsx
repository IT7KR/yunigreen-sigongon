import { ConstructionPlanView } from "../_components/ConstructionPlanView";

export default async function ConstructionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConstructionPlanView projectId={id} />;
}
