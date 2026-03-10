import { ProjectReportTabPage } from "../_components/ProjectReportTabPage";

export default async function ProjectStartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ProjectReportTabPage projectId={id} reportType="start" />;
}
